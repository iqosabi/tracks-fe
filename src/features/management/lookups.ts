import type { Role } from '../../core/auth/schema';
import type { ApiClient } from '../../core/api/client';
import { query as domQuery } from '../../shared/ui/dom';
import { items, pick } from '../../shared/data/presentation';
import { messageOf as errorText } from '../../shared/data/guards';
export async function fillLookups(
  holder: HTMLElement,
  signal: AbortSignal,
  { role, request }: { role: Role; request: ApiClient['request'] },
) {
  for (const select of holder.querySelectorAll<HTMLSelectElement>('[data-lookup]')) {
    const type = select.dataset.lookup,
      endpoint =
        type === 'bus'
          ? '/cms/buses'
          : type === 'route'
            ? '/cms/routes'
            : type === 'operator'
              ? '/cms/operators'
              : '/cms/devices';
    if (type === 'operator' && role !== 'SUPER_ADMIN') {
      domQuery<HTMLLabelElement>('label:has(select[name="' + select.name + '"])', holder).hidden =
        true;
      continue;
    }
    try {
      const payload = await request(endpoint + '?page=1&limit=200', { signal });
      if (signal.aborted || !select.isConnected) return;
      const options = items(payload) || [];
      const current = select.dataset.current;
      for (const row of options) {
        const value =
          type === 'route'
            ? (row.code ?? row.routeCode)
            : (row.id ?? (type === 'bus' ? row.busId : row.deviceId));
        if (value === undefined) continue;
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = String(
          type === 'bus'
            ? pick(row, 'bodyNo', 'plateNo') || 'Bus tanpa nomor'
            : type === 'operator'
              ? pick(row, 'name', 'code') || 'Operator tanpa nama'
              : type === 'route'
                ? pick(row, 'value', 'name', 'code') || 'Rute tanpa nama'
                : pick(row, 'label', 'bodyNo') || 'Perangkat tanpa nama',
        );
        if (String(value) === current) option.selected = true;
        select.append(option);
      }
      if (current && ![...select.options].some((o) => o.value === current)) {
        const option = document.createElement('option');
        option.value = current;
        option.textContent = 'Pilihan saat ini';
        option.selected = true;
        select.append(option);
      }
      domQuery('[data-lookup-note]', select.parentElement!).textContent = options.length
        ? ''
        : 'Belum ada pilihan tersedia.';
      const search = document.createElement('input');
      search.type = 'search';
      const lookupLabel = (
        { bus: 'bus', operator: 'operator', device: 'perangkat', route: 'rute' } as Record<
          string,
          string
        >
      )[type ?? 'device'];
      search.placeholder = 'Cari ' + lookupLabel;
      search.setAttribute('aria-label', 'Cari pilihan ' + lookupLabel);
      let debounce: ReturnType<typeof setTimeout> | undefined;
      let searchVersion = 0;
      signal.addEventListener('abort', () => clearTimeout(debounce), { once: true });
      search.oninput = () => {
        clearTimeout(debounce);
        const currentSearch = ++searchVersion;
        debounce = setTimeout(async () => {
          try {
            const data = await request(
              endpoint + '?page=1&limit=200&q=' + encodeURIComponent(search.value),
              { signal },
            );
            if (signal.aborted || currentSearch !== searchVersion || !select.isConnected) return;
            const previous = select.value;
            select.querySelectorAll('option:not(:first-child)').forEach((o) => o.remove());
            for (const row of items(data) || []) {
              const value =
                type === 'route'
                  ? (row.code ?? row.routeCode)
                  : (row.id ?? row.busId ?? row.deviceId);
              if (value === undefined) continue;
              const option = document.createElement('option');
              option.value = String(value);
              option.textContent = String(
                pick(row, 'bodyNo', 'label', 'name', 'value', 'code') || 'Tanpa nama',
              );
              option.selected = option.value === previous;
              select.append(option);
            }
          } catch {
            if (search.isConnected)
              domQuery('[data-lookup-note]', select.parentElement!).textContent =
                'Pencarian pilihan gagal.';
          }
        }, 300);
      };
      const finder = document.createElement('details');
      finder.className = 'lookup-search';
      const summary = document.createElement('summary');
      summary.textContent = '⌕';
      summary.setAttribute('aria-label', 'Cari pilihan ' + lookupLabel);
      finder.append(summary, search);
      select.before(finder);
    } catch (err) {
      if (select.isConnected)
        domQuery('[data-lookup-note]', select.parentElement!).textContent =
          'Pilihan gagal dimuat. ' + errorText(err);
    }
  }
}
