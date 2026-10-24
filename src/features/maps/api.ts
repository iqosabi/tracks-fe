import type { ApiClient } from '../../core/api/client';
import { fleetPath } from '../monitoring/api';
import { items } from '../../shared/data/records';
import { record } from '../../shared/data/guards';
import type { ApiRecord } from '../../core/types';
import { busPositions } from './data';
/** Bounded traversal, with an explicit coverage notice rather than a partial fleet presented as complete. */
export async function loadMap(api: ApiClient, signal: AbortSignal) {
  const alertsPromise = api
    .request('/monitoring/alerts', { signal })
    .then((data) => ({ data, error: '' }))
    .catch((error: unknown) => ({
      data: null,
      error: error instanceof Error ? error.message : 'Peringatan belum tersedia',
    }));
  const vehiclesPromise = (async () => {
    const rows: ApiRecord[] = [];
    const maxPages = 25;
    for (let page = 1; page <= maxPages; page++) {
      const payload = await api.request(fleetPath({ page, limit: 200 }), { signal });
      const batch = items(payload);
      if (!batch) throw new Error('Respons posisi armada tidak valid.');
      rows.push(...batch);
      const root = record(payload),
        data = record(root.data),
        meta = record(root.pagination ?? data.pagination ?? root.meta ?? data.meta);
      const totalPages = Number(meta.totalPages);
      if (batch.length < 200 || (Number.isFinite(totalPages) && page >= totalPages))
        return { rows, truncated: false };
    }
    return { rows, truncated: true };
  })();
  const [vehicles, alerts] = await Promise.all([vehiclesPromise, alertsPromise]);
  return {
    positions: busPositions(vehicles.rows, alerts.data),
    truncated: vehicles.truncated,
    alertError: alerts.error,
  };
}
