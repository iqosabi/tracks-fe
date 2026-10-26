import { test, expect } from 'vitest';
import examples from '../fixtures/api-response-examples.json';
import contract from '../fixtures/api-contract.json';
import { items } from '../../src/shared/data/records';
import { table } from '../../src/shared/ui/table-view';
import { paginationMeta } from '../../src/shared/data/pagination';
import { busPositions, delayText } from '../../src/features/maps/data';
import { fleetMetrics, totalCount } from '../../src/features/overview/data';
import { loadMap } from '../../src/features/maps/api';
import { readCollection } from '../../src/shared/data/collection';
import { loadCounts } from '../../src/features/overview/api';
import { tokenSchema } from '../../src/core/auth/schema';
import { activityStore, withActivity } from '../../src/core/activity/store';
import type { ApiClient } from '../../src/core/api/client';
function payload(path: string, method = 'GET'): unknown {
  const found = examples.endpoints.find((e) => e.path === '/api/v1' + path && e.method === method);
  if (!found) throw Error('Missing example ' + path);
  return found.response.body;
}
const lists: [string, string, string][] = [
  ['/cms/buses', 'buses', 'BUS-001'],
  ['/cms/buses/{id}', 'buses', 'BUS-001'],
  ['/cms/routes', 'routes', 'Terminal A - Terminal B'],
  ['/cms/devices', 'devices', 'OBU BUS-001'],
  ['/cms/audit', 'audit', 'admin'],
  ['/cms/users', 'users', 'operator1'],
  ['/cms/operators', 'operators', 'AMJ'],
  ['/cms/operators/{operatorId}/buses', 'buses', 'BUS-001'],
  ['/cms/operators/{operatorId}/routes', 'routes', 'Terminal A - Terminal B'],
  ['/cms/help-reports', 'tickets', 'Bus membutuhkan bantuan teknis'],
  ['/monitoring/vehicles', 'vehicles', '36 km/j'],
  ['/monitoring/alerts', 'alerts', 'Terlambat'],
  ['/monitoring/vehicles/{deviceId}/history', 'history', '09:59:58.000 WIB'],
  ['/monitoring/usage', 'usage', '100 MB'],
  ['/monitoring/usage/summary', 'usage', '50 MB'],
  ['/monitoring/operators/summary', 'operatorSummary', 'AMJ'],
];
test('provided examples cover the same 43 documented endpoint operations', () => {
  const normalize = (method: string, path: string) =>
    method + ' ' + path.replace('/api/v1', '').replace(/\{+[^}]+\}+/g, '{}');
  expect(new Set(examples.endpoints.map((e) => normalize(e.method, e.path)))).toEqual(
    new Set(contract.map((e) => normalize(e.method, e.path))),
  );
  expect(examples.endpoints).toHaveLength(43);
  expect(tokenSchema.safeParse(payload('/auth/login', 'POST')).success).toBe(true);
});
for (const [path, kind, expected] of lists)
  test('renders provided response ' + path, () => {
    const body = payload(path),
      html = table(path === '/cms/buses/{id}' ? [body] : body, kind);
    expect(html).toContain(expected);
    expect(html).not.toContain('device-example-001');
    expect(html).not.toContain('EXAMPLE_ONE_TIME');
  });
test('CMS hasMore overrides inferred totals for both short and full pages', () => {
  expect(paginationMeta({ items: [], hasMore: true }, 1, 200, 1).hasNext).toBe(true);
  expect(paginationMeta({ hasMore: false }, 1, 25, 25).hasNext).toBe(false);
  expect(paginationMeta({ data: { items: [], page: 1, hasMore: true } }, 1, 200, 1).hasNext).toBe(
    true,
  );
  expect(items(payload('/cms/users'))).toHaveLength(1);
  expect(items(payload('/monitoring/operators/summary'))).toHaveLength(1);
});
test('summary and position use actual v1.1 names without assuming counts from page lengths', () => {
  const metrics = fleetMetrics(payload('/monitoring/summary'));
  for (const label of ['Total armada', 'Total perangkat', 'Laporan bantuan terbuka', 'Beroperasi'])
    expect(metrics.find((m) => m.label === label)?.value).toBe('1');
  expect(metrics.find((m) => m.label === 'Terlambat')?.value).toBe('0');
  const [position] = busPositions(
    items(payload('/monitoring/vehicles')) ?? [],
    payload('/monitoring/alerts'),
  );
  expect(position?.busTime).toBe('2026-10-25T02:59:58.000Z');
  expect(position?.speed).toBe(36);
  expect(delayText(position?.delayMs ?? null)).toBe('1 Detik');
  expect(totalCount(payload('/cms/users'), true)).toBe('1');
  expect(totalCount(payload('/cms/buses'))).toBe('—');
});
test('map and count traversal follow short capped pages until hasMore false', async () => {
  const calls: string[] = [];
  const api: ApiClient = {
    async request(path) {
      calls.push(path);
      if (path === '/monitoring/alerts') return { items: [] };
      const page = Number(new URL('https://example.test' + path).searchParams.get('page'));
      return {
        items: [{ deviceId: 'd' + page, bodyNo: 'BUS-' + page, latitude: page, longitude: page }],
        hasMore: page === 1,
        page,
        limit: 1,
      };
    },
  };
  const map = await loadMap(api, new AbortController().signal);
  expect(map.positions).toHaveLength(2);
  expect(map.truncated).toBe(false);
  expect(calls.filter((path) => path.startsWith('/monitoring/vehicles'))).toHaveLength(2);
  const counts = await loadCounts(api, 'OPERATOR_VIEWER', new AbortController().signal);
  expect(counts.every((m) => m.value === '2')).toBe(true);
  const partial = await readCollection(api, '/cms/buses', new AbortController().signal, 1);
  expect(partial.complete).toBe(false);
  const invalid: ApiClient = {
    async request() {
      return { items: [], hasMore: true };
    },
  };
  await expect(readCollection(invalid, '/cms/buses', new AbortController().signal)).rejects.toThrow(
    'halaman kosong',
  );
});
test('loading activity remains pending until parallel work completes and releases on error', async () => {
  let release: () => void = () => {};
  const first = withActivity(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  expect(activityStore.snapshot()).toBe(1);
  await expect(
    withActivity(async () => {
      throw Error('test');
    }),
  ).rejects.toThrow('test');
  expect(activityStore.snapshot()).toBe(1);
  release();
  await first;
  expect(activityStore.snapshot()).toBe(0);
});

test('additional readable fields remain visible while internal identifiers stay hidden', () => {
  expect(table(payload('/monitoring/vehicles'), 'vehicles')).toContain('Hino');
  expect(table(payload('/cms/users'), 'users')).toContain('Diperbarui');
  expect(table(payload('/monitoring/usage'), 'usage')).toContain('Diterima');
  expect(table(payload('/cms/help-reports'), 'tickets')).not.toContain('request-example-001');
});
