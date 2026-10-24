import { items } from '../../shared/data/presentation';
import type { ApiRecord } from '../../core/types';
import { record } from '../../shared/data/guards';
export const listItems = items;
export function fleetPath({ page = 1, limit = 25, q = '', status = '' } = {}) {
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.min(100000, page))),
    limit: String(Math.max(1, Math.min(200, limit))),
  });
  if (q.trim()) params.set('q', q.trim());
  if (status) params.set('status', status);
  return '/monitoring/vehicles?' + params;
}
export function historyPath(deviceId: string) {
  return '/monitoring/vehicles/' + encodeURIComponent(deviceId) + '/history?limit=500';
}
export function flatten(value: unknown, prefix = '', out: ApiRecord = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, v] of Object.entries(record(value)))
      flatten(v, prefix ? prefix + '.' + key : key, out);
  } else out[prefix || 'value'] = value;
  return out;
}
export function monitoringApi(api: import('../../core/api/client').ApiClient) {
  return {
    fleet: (options: Parameters<typeof fleetPath>[0], signal: AbortSignal) =>
      api.request(fleetPath(options), { signal }),
    alerts: (signal: AbortSignal) => api.request('/monitoring/alerts', { signal }),
  };
}
