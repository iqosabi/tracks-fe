import { format, number } from './formatters';
import { record } from './guards';
export function responseContext(payload: unknown): { label: string; value: string }[] {
  const root = record(payload),
    data = record(root.data ?? root),
    result: { label: string; value: string }[] = [];
  if (data.unassignedBuses !== undefined)
    result.push({ label: 'Bus belum ditugaskan', value: number(data.unassignedBuses) });
  if (data.limitedTo !== undefined)
    result.push({ label: 'Batas hasil peringatan', value: number(data.limitedTo) });
  if (data.overspeedKmh !== undefined)
    result.push({ label: 'Ambang overspeed', value: format(data.overspeedKmh, 'speed') });
  return result;
}
