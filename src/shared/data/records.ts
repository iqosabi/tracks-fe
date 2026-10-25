import type { ApiRecord } from '../../core/types';
import { isRecord, record } from './guards';
export function flat(value: unknown, prefix = '', out: ApiRecord = {}) {
  if (isRecord(value)) {
    for (const [key, v] of Object.entries(value)) flat(v, prefix ? prefix + '.' + key : key, out);
  } else out[prefix || 'value'] = value;
  return out;
}
export function pick(row: unknown, ...names: string[]): unknown {
  const f = flat(row);
  for (const name of names) {
    if (f[name] !== undefined && f[name] !== null) return f[name];
    const found = Object.entries(f).find(
      ([k, v]) => k.split('.').at(-1)?.toLowerCase() === name.toLowerCase() && v !== null,
    );
    if (found) return found[1];
  }
  return undefined;
}
export function items(value: unknown): ApiRecord[] | null {
  if (Array.isArray(value)) return value.every(isRecord) ? value : null;
  const payload = record(value);
  for (const candidate of [
    payload.items,
    payload.users,
    payload.operators,
    record(payload.data).items,
    record(payload.data).users,
    record(payload.data).operators,
    payload.data,
  ])
    if (Array.isArray(candidate)) return candidate.every(isRecord) ? candidate : null;
  return null;
}
export const vehicleName = (row: unknown): unknown =>
  pick(row, 'bus.bodyNo', 'bodyNo', 'busBodyNo', 'busNo', 'label', 'device.label', 'deviceName');
