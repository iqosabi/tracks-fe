import { readCollection } from '../../shared/data/collection';
import { number } from '../../shared/data/formatters';
import type { ApiClient } from '../../core/api/client';
import type { Role } from '../../core/auth/schema';
import { countSources, totalCount, type Metric } from './data';
import { isAbortError, messageOf } from '../../shared/data/guards';
export async function loadCounts(
  api: ApiClient,
  role: Role,
  signal: AbortSignal,
): Promise<Metric[]> {
  return Promise.all(
    countSources(role).map(async (source) => {
      try {
        return {
          label: source.label,
          ...(source.unpaginated
            ? { value: totalCount(await api.request(source.path, { signal }), true) }
            : await (async () => {
                const result = await readCollection(api, source.path, signal);
                return {
                  value: (result.complete ? '' : '≥ ') + number(result.rows.length),
                  note: result.complete
                    ? undefined
                    : 'Batas pemuatan tercapai; jumlah ini adalah batas bawah.',
                };
              })()),
        };
      } catch (error) {
        if (isAbortError(error)) throw error;
        return { label: source.label, value: '—', error: messageOf(error) };
      }
    }),
  );
}
export function loadFleetSummary(api: ApiClient, signal: AbortSignal) {
  return api.request('/monitoring/summary', { signal });
}
