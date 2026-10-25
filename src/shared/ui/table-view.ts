import type { ApiRecord } from '../../core/types';
import { columns } from '../data/columns';
import { items, pick } from '../data/records';
import { format, number } from '../data/formatters';
import { html, escape } from './html';
export type RowActions = (row: ApiRecord, index: number) => string;
interface TableOptions {
  actions?: RowActions;
  offset?: number;
  rowIndex?: (index: number) => number;
}
export function table(
  payload: unknown,
  kind = 'vehicles',
  { actions, offset = 0, rowIndex = (index) => index }: TableOptions = {},
) {
  const rows = items(payload);
  if (rows === null)
    return '<div class="monitor-empty">Data belum dapat ditampilkan. Format respons perlu disesuaikan dengan kontrak backend.</div>';
  if (!rows.length) return '<div class="monitor-empty">Belum ada data untuk pilihan ini.</div>';
  const visible = (columns[kind] || columns.vehicles).filter((c) =>
    rows.some((row) => pick(row, ...c.names) !== undefined),
  );
  if (!visible.length)
    return '<div class="monitor-empty">Belum ada informasi yang dapat ditampilkan.</div>';
  return html`<div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th class="row-number">No.</th>
          ${visible.map((c) => `<th>${escape(c.label)}</th>`).join('')}${actions ? '<th>Aksi</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, index) =>
              `<tr><td class="row-number">${number(offset + index + 1)}</td>${visible
                .map((c) => {
                  const value = pick(row, ...c.names);
                  const text = escape(format(value, c.type));
                  return html`<td>
                    ${c.type === 'status' || c.type === 'boolean' ? `<span class="status ${['ACTIVE', 'RESOLVED', 'CLOSED', 'true', 'READY'].includes(String(value)) ? 'green' : ['IDLE', 'DELAY', 'DELAYED', 'OPEN', 'IN_PROGRESS'].includes(String(value)) ? 'amber' : 'gray'}">${text}</span>` : text}
                  </td>`;
                })
                .join(
                  '',
                )}${actions ? `<td class="row-actions">${actions(row, rowIndex(index))}</td>` : ''}</tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
}
