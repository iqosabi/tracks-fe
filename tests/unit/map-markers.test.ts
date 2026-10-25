import { test, expect } from 'vitest';
import { markerSize, markerHtml, markerTone } from '../../src/features/maps/marker-layout';
test('bus symbols grow with zoom inside readable bounds', () => {
  expect(markerSize(9)).toBe(14);
  expect(markerSize(16)).toBeGreaterThan(markerSize(12));
  expect(markerSize(-100)).toBe(14);
  expect(markerSize(100)).toBe(32);
  expect(Number.isFinite(markerSize(NaN))).toBe(true);
  for (let zoom = 1; zoom < 20; zoom++)
    expect(markerSize(zoom + 1)).toBeGreaterThanOrEqual(markerSize(zoom));
});
test('marker labels escape backend text and preserve real vehicle status', () => {
  const position = { lat: 0, lng: 0, label: '<bus & "one">', status: 'DELAY', selected: true };
  expect(markerHtml(position)).toContain('&lt;bus &amp; &quot;one&quot;&gt;');
  expect(markerHtml(position)).not.toContain('<bus');
  expect(markerTone(position)).toBe('delay');
  expect(markerTone({ ...position, overspeed: true })).toBe('overspeed');
  expect(markerTone({ ...position, status: 'OFFLINE' })).toBe('offline');
});
