import { expect, test } from 'vitest';
import type { ApiClient } from '../../src/core/api/client';
import { loadMap } from '../../src/features/maps/api';
import {
  busPositions,
  defaultOfflineAfterMs,
  offlineAfterMs,
  withBusFreshness,
} from '../../src/features/maps/data';
import { markerTone } from '../../src/features/maps/marker-layout';

const now = Date.parse('2026-10-26T06:00:00Z');
const [bus] = busPositions(
  [
    {
      deviceId: 'bus',
      latitude: 0,
      longitude: 0,
      status: 'ACTIVE',
      delayMs: 2717,
      isOverspeed: true,
    },
  ],
  [],
);

test('stale bus time overrides latency and overspeed with inactive status', () => {
  const original = { ...bus, busTime: new Date(now - 3600000).toISOString() };
  const stale = withBusFreshness(original, now);
  expect(stale.status).toBe('OFFLINE');
  expect(stale.delayMs).toBe(3600000);
  expect(stale.overspeed).toBe(false);
  expect(markerTone(stale)).toBe('offline');
  expect(original.status).toBe('ACTIVE');
  expect(withBusFreshness(original, now + 15000).delayMs).toBe(3615000);
});

test('threshold boundary and fresh updates determine the displayed status', () => {
  const original = { ...bus, busTime: new Date(now - 90000).toISOString() };
  expect(withBusFreshness(original, now).status).toBe('OFFLINE');
  expect(withBusFreshness(original, now - 1)).toBe(original);
  expect(withBusFreshness(original, now, 120000)).toBe(original);
  const fresh = { ...bus, busTime: new Date(now - 1000).toISOString() };
  expect(withBusFreshness(fresh, now)).toBe(fresh);
});

test('missing, invalid, and future timestamps never invent elapsed delay', () => {
  for (const busTime of [
    null,
    undefined,
    '',
    ' ',
    'invalid',
    {},
    new Date(now + 1000).toISOString(),
  ]) {
    const original = { ...bus, busTime };
    expect(withBusFreshness(original, now)).toBe(original);
  }
  expect(withBusFreshness({ ...bus, busTime: 0 }, now).delayMs).toBe(now);
});

test('offline threshold uses API configuration with a 90 second fallback', () => {
  expect(offlineAfterMs({ thresholds: { offlineSec: 120 } })).toBe(120000);
  expect(offlineAfterMs({ data: { thresholds: { offlineSec: '60' } } })).toBe(60000);
  for (const offlineSec of [null, '', 0, -1, 'invalid', Infinity]) {
    expect(offlineAfterMs({ thresholds: { offlineSec } })).toBe(defaultOfflineAfterMs);
  }
});

test('map loader carries the configured threshold and tolerates missing summary', async () => {
  for (const summaryFails of [false, true]) {
    const api: ApiClient = {
      async request(path) {
        if (path === '/monitoring/summary') {
          if (summaryFails) throw new Error('unavailable');
          return { thresholds: { offlineSec: 120 } };
        }
        return { items: [] };
      },
    };
    const result = await loadMap(api, new AbortController().signal);
    expect(result.offlineAfterMs).toBe(summaryFails ? 90000 : 120000);
  }
});
