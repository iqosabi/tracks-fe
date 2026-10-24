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
            const response = await fetch(base + path, {
              signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
            });
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
export async function loadLookup(api: ApiClient, type: string, query: string, signal: AbortSignal) {
  return api.request(
    lookupEndpoint(type) +
      '?' +
      new URLSearchParams({ page: '1', limit: '200', ...(query ? { q: query } : {}) }),
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
