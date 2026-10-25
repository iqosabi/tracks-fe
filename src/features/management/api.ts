import { withActivity } from '../../core/activity/store';
import { readCollection } from '../../shared/data/collection';
import { items } from '../../shared/data/records';
import type { ApiClient } from '../../core/api/client';
import type { ModuleDefinition } from './definitions';
import { buildListPath, recordPath, recordId } from './definitions';
export function listEndpoint(
  spec: ModuleDefinition,
  options: {
    page: number;
    limit: number;
    q: string;
    filters: Record<string, string>;
    path: string;
  },
) {
  if (spec.history)
    return (
      '/monitoring/vehicles/' +
      encodeURIComponent(options.filters.deviceId) +
      '/history?' +
      new URLSearchParams({
        limit: '500',
        ...(options.filters.from ? { from: options.filters.from } : {}),
        ...(options.filters.to ? { to: options.filters.to } : {}),
      })
    );
  return buildListPath(spec, options);
}
export function managementApi(api: ApiClient) {
  return {
    request: api.request,
    async health(base: string, signal: AbortSignal) {
      return Promise.all(
        [
          ['Layanan API', '/health/live'],
          ['Database', '/health/ready'],
        ].map(async ([label, path]) => {
          try {
            const response = await withActivity(() =>
              fetch(base + path, {
                signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
              }),
            );
            return { label, ready: response.ok };
          } catch {
            return { label, ready: false };
          }
        }),
      );
    },
  };
}

export function lookupEndpoint(type: string): string {
  return type === 'bus'
    ? '/cms/buses'
    : type === 'route'
      ? '/cms/routes'
      : type === 'operator'
        ? '/cms/operators'
        : '/cms/devices';
}
export async function loadLookup(
  api: ApiClient,
  type: string,
  query: string,
  signal: AbortSignal,
  page = 1,
) {
  return api.request(
    lookupEndpoint(type) +
      '?' +
      new URLSearchParams({ page: String(page), limit: '200', ...(query ? { q: query } : {}) }),
    { signal },
  );
}
export function mutationEndpoint(
  spec: ModuleDefinition,
  row: import('../../core/types').ApiRecord,
  options: {
    editing?: boolean;
    suffix?: string;
    action?: 'rotate' | 'remove' | 'detach';
    path: string;
    ownershipKind?: 'buses' | 'routes';
  },
) {
  if (options.action === 'detach') {
    const id =
      options.ownershipKind === 'routes' ? (row.code ?? row.routeCode) : (row.id ?? row.busId);
    return options.path + '/' + encodeURIComponent(String(id));
  }
  if (options.action || options.editing)
    return (
      recordPath(spec, recordId(row, spec)) +
      (options.action === 'rotate' ? '/rotate-token' : (options.suffix ?? ''))
    );
  return spec.path;
}

export async function loadModule(
  api: ApiClient,
  endpoint: string,
  signal: AbortSignal,
  resolveOperators = false,
): Promise<unknown> {
  const payload = await api.request(endpoint, { signal });
  if (!resolveOperators) return payload;
  const rows = items(payload);
  if (!rows?.length) return payload;
  // This enrichment is only used by the SUPER_ADMIN users module.
  try {
    const operators = await readCollection(api, '/cms/operators?limit=200', signal);
    const names = new Map(operators.rows.map((row) => [String(row.id), row.name ?? row.code]));
    return {
      users: rows.map((row) => ({
        ...row,
        operatorName: names.get(String(row.operatorId)) ?? row.operatorName,
      })),
    };
  } catch (error) {
    if (signal.aborted) throw error;
    return payload;
  }
}
