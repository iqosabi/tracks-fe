import { html } from '../html';
import type { Column } from '../../data/columns';
import type { ApiRecord, TablePage, Disposable } from '../../../core/types';
import type { RowActions } from '../../data/presentation';
import { paginationMeta } from '../../data/pagination';
export { paginationMeta } from '../../data/pagination';
import { query as domQuery } from '../dom';
import { table, items, columns, pick, format, number, escape } from '../../data/presentation';

export function filterReadableRows(
  rows: ApiRecord[],
  kind: string,
  query: string,
  columnDefinitions?: Column[],
) {
  const needle = query.trim().toLocaleLowerCase('id-ID');
  return rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        !needle ||
        (columnDefinitions ?? columns[kind] ?? columns.vehicles).some((c) =>
          String(format(pick(row, ...c.names), c.type))
            .toLocaleLowerCase('id-ID')
            .includes(needle),
        ),
    );
}
interface DataTableOptions {
  columnDefinitions?: Column[];
  element: HTMLElement;
  kind?: string;
  remote?: boolean;
  serverSearch?: boolean;
  pageSize?: number;
  onChange?: (page: TablePage) => void;
  actions?: RowActions;
  onRender?: () => void;
  label?: string;
}
export interface DataTable extends Disposable {
  setData(value: unknown, page?: Partial<TablePage>): void;
  setBusy(value: boolean): void;
  reset(): void;
  readonly filteredRows: ApiRecord[];
}
export function createDataTable({
  element,
  kind = 'vehicles',
  remote = false,
  serverSearch = false,
  pageSize = 25,
  onChange = () => {},
  actions,
  onRender = () => {},
  label = 'Cari data',
  columnDefinitions,
}: DataTableOptions): DataTable {
  let payload: unknown = { items: [] };
  let page = 1,
    limit = pageSize,
    query = '',
    busy = false,
    disposed = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  element.classList.add('data-table');
  element.innerHTML = html`<div class="data-table-toolbar">
      <label class="table-search"
        ><svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="6" />
          <path d="m15 15 5 5" /></svg
        ><input
          type="search"
          aria-label="${escape(label)}"
          placeholder="${remote && !serverSearch ? 'Cari di halaman ini…' : 'Cari data…'}"
          autocomplete="off" /></label
      ><label class="table-size"
        >Baris<select aria-label="Baris per halaman">
          ${[...new Set([10, 25, 50, 100, pageSize])]
            .sort((a, b) => a - b)
            .map((n) => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`)
            .join('')}
        </select></label
      >
    </div>
    <div class="data-table-body"></div>
    <div class="data-table-footer">
      <span class="table-info" role="status"></span>
      <nav class="table-pages" aria-label="Pagination tabel"></nav>
    </div>`;
  const body = domQuery('.data-table-body', element),
    search = domQuery<HTMLInputElement>('input', element),
    size = domQuery<HTMLSelectElement>('select', element),
    info = domQuery('.table-info', element),
    pages = domQuery('.table-pages', element);
  const selection = () =>
    filterReadableRows(
      items(payload) || [],
      kind,
      remote && serverSearch ? '' : query,
      columnDefinitions,
    );
  function draw() {
    if (disposed) return;
    const all = items(payload),
      filtered = selection();
    let visible, offset, maxPages, hasNext, total;
    if (remote) {
      visible = filtered;
      offset = (page - 1) * limit;
      const meta = paginationMeta(payload, page, limit, all?.length || 0);
      maxPages = meta.totalPages;
      hasNext = meta.hasNext;
      total = meta.total;
    } else {
      maxPages = Math.max(1, Math.ceil(filtered.length / limit));
      page = Math.min(page, maxPages);
      offset = (page - 1) * limit;
      visible = filtered.slice(offset, offset + limit);
      hasNext = page < maxPages;
      total = filtered.length;
    }
    body.innerHTML =
      all === null
        ? '<div class="monitor-empty">Data belum dapat ditampilkan. Format respons perlu disesuaikan.</div>'
        : table(
            visible.map((x) => x.row),
            kind,
            { actions, offset, rowIndex: (index) => visible[index].index, columnDefinitions },
          );
    body.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((button) => {
      button.disabled = busy;
    });
    const start = visible.length ? offset + 1 : 0,
      end = visible.length ? offset + visible.length : 0;
    info.textContent = `${number(start)}–${number(end)}${total !== null ? ' dari ' + number(total) : ''} data${remote && !serverSearch && query ? ' · hasil pencarian di halaman ini' : ''}`;
    const candidates = [
      ...new Set([
        1,
        page - 1,
        page,
        ...(hasNext ? [page + 1] : []),
        ...(maxPages !== null ? [maxPages] : []),
      ]),
    ]
      .filter((n) => n >= 1 && (maxPages === null || n <= maxPages))
      .sort((a, b) => a - b);
    pages.innerHTML = `<button type="button" data-table-page="${page - 1}" aria-label="Halaman sebelumnya" ${page <= 1 || busy ? 'disabled' : ''}>‹</button>${candidates.map((n, i) => `${i && n - candidates[i - 1] > 1 ? '<span class="page-gap">…</span>' : ''}<button type="button" data-table-page="${n}" ${n === page ? 'aria-current="page"' : ''} aria-label="Halaman ${n}" ${busy ? 'disabled' : ''}>${number(n)}</button>`).join('')}<button type="button" data-table-page="${page + 1}" aria-label="Halaman berikutnya" ${!hasNext || busy ? 'disabled' : ''}>›</button>`;
    size.disabled = busy;
    element.setAttribute('aria-busy', String(busy));
    onRender();
  }
  function change(nextPage: number) {
    if (disposed || busy) return;
    page = nextPage;
    if (remote) onChange({ page, limit, q: serverSearch ? query : '' });
    else draw();
  }
  pages.onclick = (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-table-page]')
        : null;
    if (button && !button.disabled) change(Number(button.dataset.tablePage));
  };
  search.oninput = () => {
    query = search.value;
    clearTimeout(debounce);
    if (remote && serverSearch) {
      page = 1;
      debounce = setTimeout(() => {
        if (!disposed) onChange({ page, limit, q: query });
      }, 350);
    } else {
      if (!remote) page = 1;
      draw();
    }
  };
  search.onkeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(debounce);
      if (remote && serverSearch) {
        page = 1;
        onChange({ page, limit, q: query });
      }
    }
  };
  size.onchange = () => {
    limit = Number(size.value);
    page = 1;
    if (remote) onChange({ page, limit, q: serverSearch ? query : '' });
    else draw();
  };
  draw();
  return {
    setData(value, { page: nextPage, limit: nextLimit, q } = {}) {
      payload = value;
      if (nextPage !== undefined) page = nextPage;
      if (nextLimit !== undefined) {
        limit = nextLimit;
        size.value = String(limit);
      }
      if (q !== undefined && serverSearch && document.activeElement !== search) {
        query = q;
        search.value = q;
      }
      draw();
    },
    setBusy(value) {
      busy = value;
      draw();
    },
    reset() {
      clearTimeout(debounce);
      query = '';
      page = 1;
      search.value = '';
      draw();
    },
    get filteredRows() {
      return selection().map((x) => x.row);
    },
    destroy() {
      disposed = true;
      clearTimeout(debounce);
      pages.onclick = null;
      search.oninput = null;
      search.onkeydown = null;
      size.onchange = null;
    },
  };
}
