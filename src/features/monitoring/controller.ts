import { fleetPath } from './api';
import { html } from '../../shared/ui/html';
import type { AuthClient } from '../../core/auth/client';
import { apiFor } from '../../core/api/client';
import { ApiError } from '../../core/api/errors';
import type { FeatureController, Notify } from '../../core/types';
import type { DataTable } from '../../shared/ui/data-table';
import type { FleetMap, FleetPosition } from '../maps/fleet-map';
import { record, isAbortError, messageOf } from '../../shared/data/guards';
import { query as domQuery, formTarget } from '../../shared/ui/dom';
import { summaryCards, statusText, vehicleName, items, pick } from '../../shared/data/presentation';
import { createFleetMap } from '../maps/fleet-map';
import { createDataTable } from '../../shared/ui/data-table';
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
function alertItems(payload: unknown) {
  if (items(payload) !== null) return payload;
  const result = [];
  for (const [type, rows] of Object.entries(record(record(payload).data || payload)))
    if (Array.isArray(rows))
      for (const row of rows)
        result.push({
          ...record(row),
          type: record(row).type || type.replace(/vehicles|alerts/gi, '').toUpperCase(),
        });
  return result;
}
function points(payload: unknown): FleetPosition[] {
  return (items(payload) || []).flatMap((row) => {
    const lat = pick(row, 'latitude', 'lat'),
      lng = pick(row, 'longitude', 'lng', 'lon');
    if (
      lat === null ||
      lng === null ||
      lat === '' ||
      lng === '' ||
      lat === undefined ||
      lng === undefined
    )
      return [];
    const y = Number(lat),
      x = Number(lng);
    return Number.isFinite(y) && Number.isFinite(x) && Math.abs(y) <= 90 && Math.abs(x) <= 180
      ? [
          {
            lat: y,
            lng: x,
            label: String(vehicleName(row) || 'Kendaraan'),
            status: String(pick(row, 'status') || ''),
          },
        ]
      : [];
  });
}

export function mountMonitoring({
  element,
  auth,
  view = 'overview',
  notify = () => {},
}: {
  element: HTMLElement;
  auth: AuthClient;
  view?: string;
  notify?: Notify;
}): FeatureController {
  let disposed = false,
    page = 1,
    limit = 25,
    q = '',
    status = '',
    retryAt = 0,
    version = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let fleetMap: FleetMap | null = null;
  const tables = new Map<string, DataTable>(),
    slots = new Map<string, unknown>();
  const api = apiFor(auth);
  const panel = (id: string, title: string, subtitle = '') =>
    `<section class="panel monitor-panel"><div class="panel-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><span id="${id}-time" class="muted"></span></div><div id="${id}-error" role="status"></div><div id="${id}-body" class="monitor-body"><div class="monitor-empty">Memuat data…</div></div></section>`;
  element.innerHTML = html`<div class="monitor-toolbar">
      <span id="poll-state" role="status">Menghubungkan Fleet Monitoring…</span
      ><label><input id="auto-poll" type="checkbox" checked /> Perbarui setiap 15 detik</label>
    </div>
    ${view === 'fleet' || view === 'map' ? `<form id="live-filter" class="filter-grid monitor-filters"><label class="field">Status kendaraan<select name="status"><option value="">Semua status</option>${['ACTIVE', 'IDLE', 'DELAYED', 'OFFLINE'].map((s) => `<option value="${s}">${statusText(s)}</option>`).join('')}</select></label><div class="filter-actions"><button type="button" id="reset-filter" class="button secondary">Reset</button><button type="submit" class="button primary">Terapkan filter</button></div></form>` : ''}${view === 'overview' ? panel('summary', 'Kondisi armada', 'Kondisi armada Anda saat ini') : ''}${['overview', 'fleet', 'map'].includes(view) ? panel('vehicles', view === 'map' ? 'Posisi GPS armada' : 'Armada live', 'Status dan posisi kendaraan terkini') : ''}${['overview', 'alerts'].includes(view) ? panel('alerts', 'Peringatan armada', 'Kendaraan yang perlu diperhatikan') : ''}`;
  const get = <T extends HTMLElement = HTMLElement>(id: string): T =>
    domQuery<T>('#' + id, element);
  async function request(path: string, signal: AbortSignal): Promise<unknown> {
    try {
      return await api.request(path, { signal });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) retryAt = error.retryAt;
      throw error;
    }
  }
  function ensureTable(id: string) {
    const existing = tables.get(id);
    if (existing) return existing;
    const body = get(id + '-body');
    let holder = body;
    if (id === 'vehicles' && (view === 'map' || view === 'overview')) {
      body.innerHTML = '<div class="carto-live-region"></div><div class="live-map-records"></div>';
      fleetMap = createFleetMap(domQuery('.carto-live-region', body));
      holder = domQuery('.live-map-records', body);
    }
    const widget = createDataTable({
      element: holder,
      kind: id === 'vehicles' ? 'vehicles' : 'alerts',
      remote: id === 'vehicles',
      serverSearch: id === 'vehicles',
      pageSize: limit,
      onChange: (next) => {
        page = next.page;
        limit = next.limit;
        q = next.q;
        triggerRefresh();
      },
    });
    tables.set(id, widget);
    return widget;
  }
  async function load(id: string, path: string, currentVersion: number) {
    try {
      const payload = await request(path, controller!.signal);
      if (disposed || currentVersion !== version) return;
      slots.set(id, payload);
      if (id === 'summary') get(id + '-body').innerHTML = summaryCards(payload);
      else {
        const widget = ensureTable(id);
        widget.setData(id === 'alerts' ? alertItems(payload) : payload, {
          page: id === 'vehicles' ? page : undefined,
          limit: id === 'vehicles' ? limit : undefined,
          q: id === 'vehicles' ? q : undefined,
        });
        if (id === 'vehicles') fleetMap?.update(points(payload));
      }
      get(id + '-error').innerHTML = '';
      get(id + '-time').textContent = 'Diterima ' + new Date().toLocaleTimeString('id-ID');
    } catch (error) {
      if (disposed || currentVersion !== version || isAbortError(error)) return;
      if (!slots.has(id) && !tables.has(id)) get(id + '-body').innerHTML = '';
      get(id + '-error').innerHTML =
        `<div class="notice error">${esc(messageOf(error))}${slots.has(id) ? ' Data sebelumnya mungkin sudah tidak terbaru.' : ''}</div>`;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403))
        get<HTMLInputElement>('auto-poll').checked = false;
    }
  }
  function triggerRefresh(): void {
    void refresh().catch((error: unknown) => {
      if (!disposed) notify(messageOf(error));
    });
  }
  function schedule() {
    clearTimeout(timer);
    if (!disposed && get<HTMLInputElement>('auto-poll').checked)
      timer = setTimeout(triggerRefresh, Math.max(15000, retryAt - Date.now()));
  }
  async function refresh() {
    if (disposed) return;
    clearTimeout(timer);
    if (document.hidden) {
      schedule();
      return;
    }
    if (Date.now() < retryAt) {
      get('poll-state').textContent =
        'Menunggu batas API hingga ' + new Date(retryAt).toLocaleTimeString('id-ID');
      schedule();
      return;
    }
    const currentVersion = ++version;
    controller?.abort();
    controller = new AbortController();
    for (const widget of tables.values()) widget.setBusy(true);
    get('poll-state').textContent = 'Memperbarui data…';
    const jobs = [];
    if (element.querySelector('#summary-body'))
      jobs.push(load('summary', '/monitoring/summary', currentVersion));
    if (element.querySelector('#vehicles-body'))
      jobs.push(load('vehicles', fleetPath({ page, limit, q, status }), currentVersion));
    if (element.querySelector('#alerts-body'))
      jobs.push(load('alerts', '/monitoring/alerts', currentVersion));
    await Promise.allSettled(jobs);
    if (disposed || currentVersion !== version) return;
    for (const widget of tables.values()) widget.setBusy(false);
    get('poll-state').textContent = slots.size
      ? 'Terakhir diperbarui ' + new Date().toLocaleTimeString('id-ID')
      : 'Belum ada data yang berhasil diterima.';
    schedule();
  }
  get<HTMLInputElement>('auto-poll').onchange = () => {
    clearTimeout(timer);
    if (get<HTMLInputElement>('auto-poll').checked) triggerRefresh();
  };
  element.querySelector<HTMLFormElement>('#live-filter')?.addEventListener('submit', (event) => {
    event.preventDefault();
    status = String(new FormData(formTarget(event)).get('status'));
    page = 1;
    triggerRefresh();
  });
  element.querySelector('#reset-filter')?.addEventListener('click', () => {
    status = '';
    q = '';
    page = 1;
    get<HTMLFormElement>('live-filter').reset();
    tables.get('vehicles')?.reset();
    triggerRefresh();
  });
  const visible = () => {
    if (!document.hidden && get<HTMLInputElement>('auto-poll').checked) triggerRefresh();
  };
  document.addEventListener('visibilitychange', visible);
  triggerRefresh();
  return {
    refresh,
    destroy() {
      disposed = true;
      version++;
      clearTimeout(timer);
      controller?.abort();
      fleetMap?.destroy();
      for (const widget of tables.values()) widget.destroy();
      tables.clear();
      slots.clear();
      document.removeEventListener('visibilitychange', visible);
    },
  };
}
