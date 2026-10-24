import type { ApiRecord } from '../../core/types';
import type { FieldSpec } from './definitions';
import { escape as esc, statusText } from '../../shared/data/presentation';
import { html } from '../../shared/ui/html';
export const fieldsInput = (
  fields: FieldSpec[],
  editing = false,
  row: ApiRecord = {},
  filtering = false,
) =>
  fields
    .map((f) => {
      let value = row[f.key];
      if (f.type === 'datetime-local' && value) {
        const d = new Date(String(value));
        value = Number.isFinite(d.getTime())
          ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '';
      }
      if (f.type === 'milliseconds' && value !== undefined) value = Number(value) / 1000;
      const label = `${esc(f.label)}${!editing && !filtering && f.type !== 'boolean' ? ' <span class="required">*</span>' : ''}`;
      if (f.type === 'boolean')
        return html`<label class="field"
          >${label}<select name="${f.key}">
            ${editing ? '<option value="">Tidak diubah</option>' : '<option value="true">Aktif</option>'}${editing ? '<option value="true" ' + (value === true ? 'selected' : '') + '>Aktif</option>' : ''}
            <option value="false" ${value === false ? 'selected' : ''}>Nonaktif</option>
          </select></label
        >`;
      if (['role', 'ticketStatus'].includes(f.type)) {
        const options =
          f.type === 'role'
            ? ['OPERATOR_VIEWER', 'OPERATOR_ADMIN', 'SUPER_ADMIN']
            : ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        return html`<label class="field"
          >${label}<select name="${f.key}" ${!editing && !filtering ? 'required' : ''}>
            ${filtering ? '<option value="">Semua status</option>' : editing ? '<option value="">Tidak diubah</option>' : '<option value="">Pilih ' + esc(f.label.toLowerCase()) + '</option>'}${options.map((v) => `<option value="${v}" ${v === value ? 'selected' : ''}>${statusText(v)}</option>`).join('')}
          </select></label
        >`;
      }
      if (['bus', 'operator', 'device', 'route'].includes(f.type))
        return html`<label class="field"
          >${label}<select
            name="${f.key}"
            data-lookup="${f.type}"
            data-current="${esc(value ?? '')}"
            ${!editing && !filtering ? 'required' : ''}
          >
            <option value="">
              ${filtering ? 'Semua ' + esc(f.label.toLowerCase()) : editing ? 'Tidak diubah' : 'Pilih ' + esc(f.label.toLowerCase())}
            </option></select
          ><small data-lookup-note>Memuat pilihan…</small></label
        >`;
      if (f.type === 'textarea')
        return html`<label class="field"
          >${label}<textarea name="${f.key}" rows="3" ${!editing && !filtering ? 'required' : ''}>
${esc(value ?? '')}</textarea>
        </label>`;
      return html`<label class="field"
        >${label}<input
          name="${f.key}"
          type="${f.type === 'milliseconds' || f.type === 'number' ? 'number' : f.type}"
          value="${f.type === 'password' ? '' : esc(value ?? '')}"
          ${['milliseconds', 'number'].includes(f.type) ? 'min="0.001" step="any"' : ''}
          ${!editing && !filtering ? 'required' : ''}
          autocomplete="${f.type === 'password' ? 'new-password' : 'off'}"
      /></label>`;
    })
    .join('');
