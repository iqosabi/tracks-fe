import { record } from './guards';
import { date, number, format } from './formatters';
export function responseContext(payload: unknown): { label: string; value: string }[] {
  const root = record(payload),
    data = record(root.data ?? root),
    result: { label: string; value: string }[] = [];
  for (const [key, label] of [
    ['measuredAt', 'Waktu data'],
    ['from', 'Dari'],
    ['to', 'Sampai'],
  ] as const) {
    const value = data[key];
    if (value !== undefined && value !== null)
      result.push({
        label,
        value: /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? format(value, 'day') : date(value),
      });
  }
  if (data.unassignedBuses !== undefined)
    result.push({ label: 'Bus belum ditugaskan', value: number(data.unassignedBuses) });
  if (data.limitedTo !== undefined)
    result.push({ label: 'Batas hasil peringatan', value: number(data.limitedTo) });
  if (data.overspeedKmh !== undefined)
    result.push({ label: 'Ambang overspeed', value: format(data.overspeedKmh, 'speed') });
  return result;
}
