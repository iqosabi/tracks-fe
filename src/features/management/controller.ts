import { fieldsInput } from './form-view';
import { fillLookups } from './lookups';
import { openDialog as openSharedDialog, type Dialog } from '../../shared/ui/dialog';
import { html } from '../../shared/ui/html';
import type { AuthClient } from '../../core/auth/client';
import { apiFor } from '../../core/api/client';
import type { FeatureController, Notify, ApiRecord } from '../../core/types';
import type { DataTable } from '../../shared/ui/data-table';
import type { ModuleId } from './definitions';
import { record, isAbortError, messageOf } from '../../shared/data/guards';
import { query as domQuery, formTarget } from '../../shared/ui/dom';
import { createDataTable } from '../../shared/ui/data-table';
import {
  modules,
  canWrite,
  recordId,
  recordPath,
  validateDates,
  buildListPath,
} from './definitions';
import { escape as esc, items, pick, statusText } from '../../shared/data/presentation';

export function mountManagement({
  element,
  auth,
  id,
  base,
  notify = () => {},
}: {
  element: HTMLElement;
  auth: AuthClient;
  id: ModuleId;
  base: string;
  notify?: Notify;
}): FeatureController {
  const spec = modules[id],
    role = auth.user?.role ?? 'OPERATOR_VIEWER';
  if (!spec || (spec.super && role !== 'SUPER_ADMIN')) {
    element.innerHTML = '<div class="notice error">Anda tidak memiliki akses ke modul ini.</div>';
    return { async refresh() {}, destroy() {} };
  }
  let disposed = false,
    loading = false,
    page = 1,
    limit = 25,
    query = '',
    filters: Record<string, string> = {},
    path = spec.path,
    rows: ApiRecord[] = [],
    controller: AbortController | null = null,
    context: { operator: ApiRecord; kind: 'buses' | 'routes' } | null = null,
    dialog: Dialog | null = null,
    dialogController: AbortController | null = null,
    lookupController: AbortController | null = null,
    dataTable: DataTable | null = null,
    dialogTable: DataTable | null = null,
    version = 0;
  const api = apiFor(auth);
  const get = <T extends HTMLElement = HTMLElement>(selector: string): T =>
    domQuery<T>(selector, element);
  const titleFor = (row: ApiRecord) =>
    pick(row, 'bodyNo', 'label', 'name', 'username', 'value', 'code', 'deviceName') ||
    'Data terpilih';
  const isWritable = () =>
    canWrite(spec, role) &&
    !['usage', 'history', 'audit', 'operatorSummary', 'account', 'health'].includes(id);
  const errorText = messageOf;
  function hideDialog(): void {
    dialogController?.abort();
    dialogController = null;
    dialogTable?.destroy();
    dialogTable = null;
    dialog?.destroy();
    dialog = null;
  }
  function openDialog(title: string, body: string): HTMLElement {
    hideDialog();
    dialog = openSharedDialog(title, body, () => {
      dialogController?.abort();
      dialogController = null;
      dialogTable?.destroy();
      dialogTable = null;
    });
    return dialog.element;
  }
  async function request(endpoint: string, init: RequestInit = {}): Promise<unknown> {
    return api.request(endpoint, { ...init, signal: init.signal ?? controller?.signal });
  }
  async function showForm(mode: 'create' | 'edit', row: ApiRecord = {}) {
    const operation = mode === 'create' ? spec.create : spec.edit;
    if (!operation || !isWritable()) return;
    const editing = mode === 'edit';
    const holder = openDialog(
      (editing ? 'Ubah ' : 'Tambah ') + spec.title.toLowerCase(),
      `<form class="entity-form">${fieldsInput(operation.fields, editing, row)}<div class="form-error" role="alert"></div><button class="button primary full" type="submit">Simpan ${esc(spec.title.toLowerCase())}</button></form>`,
    );
    dialogController = new AbortController();
    const signal = dialogController.signal;
    void fillLookups(holder, signal, { role, request });
    const roleSelect = holder.querySelector<HTMLSelectElement>('[name=role]'),
      operatorSelect = holder.querySelector<HTMLSelectElement>('[name=operatorId]');
    const syncRole = () => {
      if (operatorSelect) {
        const superRole = (roleSelect?.value || row.role) === 'SUPER_ADMIN';
        operatorSelect.required = !editing && !superRole;
        operatorSelect.disabled = superRole;
      }
    };
    roleSelect?.addEventListener('change', syncRole);
    syncRole();
    domQuery<HTMLFormElement>('form', holder).onsubmit = async (event) => {
      event.preventDefault();
      const form = formTarget(event),
        data = new FormData(form),
        body: ApiRecord = {};
      for (const f of operation.fields) {
        const value = data.get(f.key);
        if (value === null || (editing && value === '')) continue;
        if (f.type === 'boolean') body[f.key] = value === 'true';
        else if (f.type === 'milliseconds') body[f.key] = Number(value) * 1000;
        else if (f.type === 'number') body[f.key] = Number(value);
        else body[f.key] = f.type === 'password' ? String(value) : String(value).trim();
      }
      if (id === 'users') {
        const assignedRole = body.role || row.role;
        if (assignedRole === 'SUPER_ADMIN') body.operatorId = null;
        else if (!body.operatorId && !row.operatorId) {
          domQuery('.form-error', form).textContent = 'Pilih operator untuk akun operator.';
          return;
        }
      }
      if (!Object.keys(body).length) {
        domQuery('.form-error', form).textContent = 'Belum ada perubahan yang diisi.';
        return;
      }
      const button = domQuery<HTMLButtonElement>('[type=submit]', form);
      button.disabled = true;
      try {
        const endpoint = editing
          ? recordPath(spec, recordId(row, spec)) + (operation.suffix || '')
          : spec.path;
        const result = await request(endpoint, {
          method: operation.method,
          body: JSON.stringify(body),
          signal,
        });
        if (disposed) return;
        hideDialog();
        notify('Data berhasil disimpan.');
        if (id === 'devices' && mode === 'create') showToken(result);
        await refresh();
      } catch (err) {
        if (!disposed && form.isConnected) {
          domQuery('.form-error', form).textContent = errorText(err);
          button.disabled = false;
        }
      }
    };
  }
  function showToken(payload: unknown) {
    if (disposed) return;
    const token =
      record(payload).token ??
      record(payload).deviceToken ??
      record(record(payload).data).token ??
      record(record(payload).data).deviceToken;
    if (typeof token !== 'string') {
      notify(
        'Perangkat berhasil disimpan. Token tidak ditemukan pada format respons yang diterima.',
      );
      return;
    }
    const holder = openDialog(
      'Token perangkat baru',
      `<p>Token hanya ditampilkan pada respons ini. Salin ke konfigurasi perangkat sebelum menutup.</p><label class="field">Token perangkat<textarea class="one-time-token" readonly spellcheck="false"></textarea></label><button type="button" class="button secondary full" id="copy-token">Salin token</button>`,
    );
    domQuery<HTMLTextAreaElement>('textarea', holder).value = token;
    domQuery('#copy-token', holder).onclick = async () => {
      try {
        await navigator.clipboard.writeText(token);
        notify('Token disalin.');
      } catch {
        domQuery<HTMLTextAreaElement>('textarea', holder).select();
        notify('Pilih dan salin token secara manual.');
      }
    };
  }
  function confirmAction(
    title: string,
    message: string,
    action: (signal: AbortSignal) => Promise<unknown>,
  ) {
    const holder = openDialog(
      title,
      `<p>${esc(message)}</p><div class="form-error" role="alert"></div><button type="button" class="button danger full" id="confirm-action">${esc(title)}</button>`,
    );
    dialogController = new AbortController();
    const signal = dialogController.signal;
    domQuery<HTMLButtonElement>('#confirm-action', holder).onclick = async () => {
      domQuery<HTMLButtonElement>('#confirm-action', holder).disabled = true;
      try {
        const value = await action(signal);
        if (disposed) return;
        hideDialog();
        notify('Aksi berhasil.');
        if (title === 'Rotasi token') showToken(value);
        await refresh();
      } catch (err) {
        if (holder.isConnected) {
          domQuery('.form-error', holder).textContent = errorText(err);
          domQuery<HTMLButtonElement>('#confirm-action', holder).disabled = false;
        }
      }
    };
  }
  function ownership(kind: 'buses' | 'routes', row: ApiRecord) {
    context = { operator: row, kind };
    page = 1;
    query = '';
    filters = {};
    path = recordPath(spec, recordId(row, spec)) + '/' + kind;
    render();
    refresh();
  }
  function assign() {
    if (!context) return;
    const kind = context.kind,
      type = kind === 'buses' ? 'bus' : 'route',
      key = kind === 'buses' ? 'busId' : 'routeCode';
    const holder = openDialog(
      kind === 'buses' ? 'Tetapkan bus' : 'Tambahkan akses rute',
      `<p>${kind === 'buses' ? 'Bus yang dipilih akan menjadi milik operator ini. Jika sebelumnya dimiliki operator lain, akses telemetry akan berpindah.' : 'Operator akan mendapatkan akses ke rute yang dipilih.'}</p><form class="entity-form">${fieldsInput([{ key, label: kind === 'buses' ? 'Bus' : 'Rute', type }])}<div class="form-error" role="alert"></div><button class="button primary full" type="submit">Konfirmasi penetapan</button></form>`,
    );
    dialogController = new AbortController();
    const signal = dialogController.signal;
    void fillLookups(holder, signal, { role, request });
    domQuery<HTMLFormElement>('form', holder).onsubmit = async (event) => {
      event.preventDefault();
      const form = formTarget(event),
        value = new FormData(form).get(key);
      domQuery<HTMLButtonElement>('button[type=submit]', form).disabled = true;
      try {
        await request(path + '/' + encodeURIComponent(String(value ?? '')), {
          method: 'PUT',
          signal,
        });
        hideDialog();
        notify('Akses operator berhasil diperbarui.');
        await refresh();
      } catch (err) {
        if (form.isConnected) {
          domQuery('.form-error', form).textContent = errorText(err);
          domQuery<HTMLButtonElement>('button[type=submit]', form).disabled = false;
        }
      }
    };
  }
  function actions(row: ApiRecord, index: number) {
    const rid = recordId(
      row,
      context ? { idField: context.kind === 'routes' ? 'code' : undefined } : spec,
    );
    if (rid === null || rid === undefined) return '';
    if (context)
      return html`<button
        class="button secondary action-button"
        data-action="detach"
        data-index="${index}"
      >
        Lepas akses
      </button>`;
    return html`${spec.detail ? `<button class="button secondary action-button" data-action="detail" data-index="${index}">Detail</button>` : ''}${spec.ownership ? `<button class="button secondary action-button" data-action="buses" data-index="${index}">Bus</button><button class="button secondary action-button" data-action="routes" data-index="${index}">Rute</button>` : ''}${isWritable() && spec.edit ? `<button class="button secondary action-button" data-action="edit" data-index="${index}">${spec.ticket ? 'Ubah status' : 'Ubah'}</button>` : ''}${isWritable() && spec.rotate ? `<button class="button secondary action-button" data-action="rotate" data-index="${index}">Rotasi token</button>` : ''}${isWritable() && spec.remove ? `<button class="button secondary action-button destructive" data-action="remove" data-index="${index}">${id === 'devices' ? 'Nonaktifkan' : 'Hapus'}</button>` : ''}`;
  }
  async function act(event: MouseEvent) {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-action]')
        : null;
    if (!button) return;
    const row = rows[Number(button.dataset.index)];
    if (!row) return;
    const action = button.dataset.action;
    if (action === 'edit') showForm('edit', row);
    else if (action === 'buses' || action === 'routes') ownership(action, row);
    else if (action === 'detail') {
      const holder = openDialog('Detail bus', '<div class="detail-content">Memuat…</div>');
      dialogController = new AbortController();
      try {
        const data = await request(recordPath(spec, recordId(row, spec)), {
          signal: dialogController.signal,
        });
        if (holder.isConnected) {
          dialogTable = createDataTable({
            element: domQuery('.detail-content', holder),
            kind: 'buses',
          });
          dialogTable.setData([record(data).bus ?? record(data).data ?? data]);
        }
      } catch (err) {
        if (holder.isConnected) domQuery('.detail-content', holder).textContent = errorText(err);
      }
    } else if (action === 'rotate')
      confirmAction(
        'Rotasi token',
        'Token lama untuk ' + titleFor(row) + ' akan dicabut. Perangkat harus memakai token baru.',
        (signal) =>
          request(recordPath(spec, recordId(row, spec)) + '/rotate-token', {
            method: 'POST',
            signal,
          }),
      );
    else if (action === 'remove')
      confirmAction(
        id === 'devices' ? 'Nonaktifkan perangkat' : 'Hapus data',
        (id === 'buses'
          ? 'Bus hanya dapat dihapus jika tidak dimiliki operator. '
          : id === 'devices'
            ? 'Perangkat akan dinonaktifkan. '
            : 'Data akan dihapus. ') + titleFor(row),
        (signal) => request(recordPath(spec, recordId(row, spec)), { method: 'DELETE', signal }),
      );
    else if (action === 'detach' && context) {
      const selectedContext = context;
      const selectedPath = path;
      const rid =
        selectedContext.kind === 'routes' ? (row.code ?? row.routeCode) : (row.id ?? row.busId);
      confirmAction(
        'Lepas akses',
        'Operator akan kehilangan akses ke ' +
          titleFor(row) +
          (selectedContext.kind === 'buses' ? ' beserta perangkat dan telemetry-nya.' : '.'),
        (signal) =>
          request(selectedPath + '/' + encodeURIComponent(String(rid)), {
            method: 'DELETE',
            signal,
          }),
      );
    }
  }
  function render() {
    dataTable?.destroy();
    dataTable = null;
    element.innerHTML = html`${context ? `<div class="context-bar"><button class="text-button" id="back">← Semua operator</button><strong>${esc(titleFor(context.operator))} / ${context.kind === 'buses' ? 'Bus' : 'Rute'}</strong><button class="button primary" id="assign">${context.kind === 'buses' ? 'Tetapkan bus' : 'Tambah akses rute'}</button></div>` : ''}${spec.tabs ? `<div class="module-tabs">${spec.tabs.map(([label, endpoint]) => `<button class="button ${path === endpoint ? 'primary' : 'secondary'}" data-tab="${endpoint}">${label}</button>`).join('')}</div>` : ''}${!spec.health && !spec.profile ? `<form id="module-filter" class="module-filter filter-grid">${!context ? fieldsInput(spec.filters || [], false, filters, true) : ''}${spec.filters && !context ? '<div class="filter-actions"><button type="button" id="module-reset" class="button secondary">Reset</button><button type="submit" class="button primary">Terapkan filter</button></div>' : ''}${!context && isWritable() && spec.create ? '<button id="create" type="button" class="button primary">+ Tambah ' + esc(spec.title.toLowerCase()) + '</button>' : ''}</form>` : ''}
      <div id="module-status" role="status"></div>
      <section class="panel module-panel">
        <div id="module-data">
          <div class="monitor-empty">
            ${spec.history ? 'Pilih perangkat untuk menampilkan riwayat GPS.' : 'Memuat data…'}
          </div>
        </div>
      </section>`;
    if (!spec.health && !spec.profile) {
      dataTable = createDataTable({
        element: get('#module-data'),
        kind: context ? context.kind : spec.kind,
        remote: !!spec.paginated || !!context,
        serverSearch: !!spec.search,
        actions:
          context ||
          spec.detail ||
          spec.ownership ||
          (isWritable() && (spec.edit || spec.remove || spec.rotate))
            ? actions
            : undefined,
        onChange: (next) => {
          page = next.page;
          limit = next.limit;
          if (spec.search) query = next.q;
          refresh();
        },
      });
    }
    get('#module-data').onclick = act;
    element.querySelector('#create')?.addEventListener('click', () => showForm('create'));
    element.querySelector('#assign')?.addEventListener('click', assign);
    element.querySelector('#back')?.addEventListener('click', () => {
      context = null;
      path = spec.path;
      page = 1;
      query = '';
      render();
      refresh();
    });

    element.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(
      (b) =>
        (b.onclick = () => {
          if (!loading) {
            path = b.dataset.tab!;
            page = 1;
            render();
            refresh();
          }
        }),
    );
    element.querySelector('#module-filter')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(formTarget(event));
      const values = Object.fromEntries(
        (spec.filters || []).map((f) => [f.key, String(data.get(f.key) || '')]),
      );
      try {
        filters = validateDates(values, { history: spec.history });
        if (spec.history && !filters.deviceId) throw Error('Pilih perangkat terlebih dahulu.');
        page = 1;
        refresh();
      } catch (err) {
        get('#module-status').innerHTML =
          '<div class="notice error">' + esc(messageOf(err)) + '</div>';
      }
    });
    element.querySelector('#module-reset')?.addEventListener('click', () => {
      filters = {};
      page = 1;
      query = '';
      render();
      refresh();
    });
    lookupController?.abort();
    lookupController = new AbortController();
    void fillLookups(element, lookupController.signal, { role, request });
  }
  async function health() {
    const targets = [
      ['Layanan API', '/health/live'],
      ['Database', '/health/ready'],
    ];
    const results = await Promise.all(
      targets.map(async ([label, endpoint]) => {
        try {
          const response = await fetch(base + endpoint, {
            signal: AbortSignal.any([controller!.signal, AbortSignal.timeout(15000)]),
          });
          return { label, ready: response.ok };
        } catch {
          return { label, ready: false };
        }
      }),
    );
    if (!disposed)
      get('#module-data').innerHTML =
        '<div class="health-grid">' +
        results
          .map(
            (r) =>
              `<article class="health-card"><span>${r.label}</span><strong class="${r.ready ? 'green' : 'destructive'}">${r.ready ? 'Terhubung' : 'Tidak tersedia'}</strong></article>`,
          )
          .join('') +
        '</div>';
  }
  async function refresh() {
    if (disposed) return;
    if (spec.history && !filters.deviceId) {
      get('#module-status').textContent = 'Pilih perangkat untuk menampilkan riwayat GPS.';
      return;
    }
    const currentVersion = ++version;
    loading = true;
    dataTable?.setBusy(true);
    controller?.abort();
    controller = new AbortController();
    get('#module-status').textContent = 'Memperbarui…';
    try {
      if (spec.health) {
        await health();
        if (!disposed)
          get('#module-status').textContent = 'Diperiksa ' + new Date().toLocaleTimeString('id-ID');
        return;
      }
      const effective = context ? { ...spec, paginated: true } : spec;
      const endpoint = spec.history
        ? '/monitoring/vehicles/' +
          encodeURIComponent(filters.deviceId) +
          '/history?' +
          new URLSearchParams({
            limit: '500',
            ...(filters.from ? { from: filters.from } : {}),
            ...(filters.to ? { to: filters.to } : {}),
          })
        : buildListPath(effective, { page, limit, q: query, filters, path });
      const payload = await request(endpoint);
      if (disposed || currentVersion !== version) return;
      if (spec.profile) {
        const user = record(record(payload).user ?? record(record(payload).data).user ?? payload);
        get('#module-data').innerHTML =
          `<div class="profile-summary"><span>Username<strong>${esc(user?.username || '—')}</strong></span><span>Peran<strong>${esc(statusText(user?.role))}</strong></span><span>Status<strong>Terautentikasi</strong></span></div>`;
      } else {
        rows = items(payload) || [];
        dataTable?.setData(payload, spec.paginated || context ? { page, limit, q: query } : {});
      }
      get('#module-status').textContent = 'Diperbarui ' + new Date().toLocaleTimeString('id-ID');
    } catch (err) {
      if (!disposed && currentVersion === version && !isAbortError(err)) {
        get('#module-status').innerHTML =
          '<div class="notice error">' + esc(errorText(err)) + '</div>';
      }
    } finally {
      if (currentVersion === version) {
        loading = false;
        dataTable?.setBusy(false);
      }
    }
  }
  render();
  refresh();
  return {
    refresh,
    destroy() {
      disposed = true;
      version++;
      dataTable?.destroy();
      controller?.abort();
      lookupController?.abort();
      hideDialog();
      rows = [];
    },
  };
}
