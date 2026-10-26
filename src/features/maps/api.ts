import type { ApiClient } from '../../core/api/client';
import { fleetPath } from '../monitoring/api';
import { items } from '../../shared/data/records';
import { paginationMeta } from '../../shared/data/pagination';
import type { ApiRecord } from '../../core/types';
import { busPositions, offlineAfterMs } from './data';
/** Bounded traversal, with an explicit coverage notice rather than a partial fleet presented as complete. */
export async function loadMap(api: ApiClient, signal: AbortSignal, maxPages = 25) {
  const thresholdPromise = api
    .request('/monitoring/summary', { signal })
    .then(offlineAfterMs)
    .catch(() => offlineAfterMs(null));
  const alertsPromise = api
    .request('/monitoring/alerts', { signal })
    .then((data) => ({ data, error: '' }))
    .catch((error: unknown) => ({
      data: null,
      error: error instanceof Error ? error.message : 'Peringatan belum tersedia',
    }));
  const vehiclesPromise = (async () => {
    const rows: ApiRecord[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const payload = await api.request(fleetPath({ page, limit: 200 }), { signal });
      const batch = items(payload);
      if (!batch) throw new Error('Respons posisi armada tidak valid.');
      rows.push(...batch);
      if (!paginationMeta(payload, page, 200, batch.length).hasNext)
        return { rows, truncated: false };
    }
    return { rows, truncated: true };
  })();
  const [vehicles, alerts, thresholdMs] = await Promise.all([
    vehiclesPromise,
    alertsPromise,
    thresholdPromise,
  ]);
  return {
    positions: busPositions(vehicles.rows, alerts.data),
    offlineAfterMs: thresholdMs,
    truncated: vehicles.truncated,
    alertError: alerts.error,
  };
}
