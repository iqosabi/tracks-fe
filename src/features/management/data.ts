import type { ApiRecord } from '../../core/types';
import type { FieldSpec, ModuleId } from './definitions';
/** Convert form units and validate cross-field invariants before an API mutation. */
export function mutationBody(
  fields: FieldSpec[],
  data: FormData,
  editing: boolean,
  id: ModuleId,
  row: ApiRecord = {},
): ApiRecord {
  const body: ApiRecord = {};
  for (const field of fields) {
    const value = data.get(field.key);
    if (value === null || (editing && value === '')) continue;
    if (field.type === 'boolean') body[field.key] = value === 'true';
    else if (field.type === 'milliseconds') body[field.key] = Number(value) * 1000;
    else if (field.type === 'number') body[field.key] = Number(value);
    else body[field.key] = field.type === 'password' ? String(value) : String(value).trim();
  }
  if (id === 'users') {
    const role = body.role || row.role;
    if (role === 'SUPER_ADMIN') body.operatorId = null;
    else if (!body.operatorId && !row.operatorId)
      throw new Error('Pilih operator untuk akun operator.');
  }
  if (!Object.keys(body).length) throw new Error('Belum ada perubahan yang diisi.');
  return body;
}
