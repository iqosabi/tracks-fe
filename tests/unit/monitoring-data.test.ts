import { test, expect } from 'vitest';
import { date, time } from '../../src/shared/data/formatters';
import { countSources, totalCount, fleetMetrics } from '../../src/features/overview/data';
import { busPositions, isOverspeed, delayText } from '../../src/features/maps/data';
test('WIB time preserves seconds and milliseconds including midnight and Unix epoch', () => {
  expect(time('2026-10-24T17:00:09.037Z')).toBe('00:00:09.037 WIB');
  expect(date('2026-10-24T06:01:12.345Z')).toContain('13:01:12.345 WIB');
  expect(time(0)).toBe('07:00:00.000 WIB');
  expect(time('bad')).toBe('—');
});
test('overview requests administrative counts only for super admin', () => {
  for (const role of ['OPERATOR_VIEWER', 'OPERATOR_ADMIN'] as const)
    expect(countSources(role).some((s) => /operators|users|audit/.test(s.path))).toBe(false);
  expect(countSources('SUPER_ADMIN').some((s) => s.path === '/cms/users')).toBe(true);
  expect(totalCount({ items: [{ id: 'first' }] })).toBe('—');
  expect(totalCount({ data: { items: [], pagination: { total: '33933' } } })).toBe('33.933');
  expect(totalCount([{ id: 1 }], true)).toBe('1');
  expect(fleetMetrics({ total: 0 }).find((m) => m.label === 'Total armada')?.value).toBe('0');
});
test('overspeed requires explicit API evidence; speed alone does not create an alert', () => {
  expect(isOverspeed({ speedKph: 150 })).toBe(false);
  expect(isOverspeed({ speedKph: 90, speedLimitKph: 60 })).toBe(true);
  expect(isOverspeed({ isOverspeed: true })).toBe(true);
  expect(isOverspeed({ speedKph: 0, speedLimitKph: 60 })).toBe(false);
  const result = busPositions(
    [
      {
        deviceId: 'one',
        bodyNo: 'BUS',
        latitude: 0,
        longitude: 0,
        speedKph: 0,
        recordedAt: '2026-10-24T00:00:00.123Z',
        receivedAt: '2026-10-24T00:00:02.456Z',
      },
    ],
    { overspeed: [{ deviceId: 'one' }] },
  );
  expect(result[0]?.overspeed).toBe(true);
  expect(result[0]?.delayMs).toBe(2333);
  expect(result[0]?.speed).toBe(0);
  expect(busPositions([{ latitude: 91, longitude: 1 }], [])).toHaveLength(0);
  expect(delayText(2333)).toBe('2 Detik');
  expect(delayText(2717)).toBe('3 Detik');
  expect(delayText(120000)).toBe('2 Menit');
  expect(delayText(3600000)).toBe('1 Jam');
  expect(delayText(0)).toBe('0 Detik');
  expect(delayText(-1)).toBe('—');
  expect(delayText(null)).toBe('—');
});

test('CMS mutation payloads preserve units, roles and partial edits', async () => {
  const { mutationBody } = await import('../../src/features/management/data');
  const { modules } = await import('../../src/features/management/definitions');
  const body = new FormData();
  body.set('sendIntervalMs', '1.25');
  body.set('label', ' Device ');
  expect(
    mutationBody(
      [
        { key: 'sendIntervalMs', label: 'Interval', type: 'milliseconds' },
        { key: 'label', label: 'Nama', type: 'text' },
      ],
      body,
      false,
      'devices',
    ),
  ).toEqual({ sendIntervalMs: 1250, label: 'Device' });
  const user = new FormData();
  user.set('role', 'SUPER_ADMIN');
  expect(
    mutationBody(modules.users.edit!.fields, user, true, 'users', { operatorId: 'old' }),
  ).toMatchObject({ role: 'SUPER_ADMIN', operatorId: null });
  expect(() => mutationBody(modules.users.create!.fields, new FormData(), false, 'users')).toThrow(
    'Pilih operator',
  );
  expect(() => mutationBody([], new FormData(), true, 'buses')).toThrow('Belum ada perubahan');
});

test('missing bus timestamp never invents a zero delay from receivedAt', () => {
  const [bus] = busPositions(
    [{ deviceId: 'one', latitude: 0, longitude: 0, receivedAt: '2026-10-24T00:00:00Z' }],
    [],
  );
  expect(bus?.busTime).toBeUndefined();
  expect(bus?.delayMs).toBeNull();
});
test('map positions preserve zero and numeric GPS headings without inventing missing ones', () => {
  const rows = [
    { bearingDegrees: 0 },
    { bearingDegrees: '90' },
    { heading: 180 },
    { bearingDegrees: 'invalid' },
    {},
  ].map((row) => ({ latitude: 0, longitude: 0, ...row }));
  expect(busPositions(rows, []).map((bus) => bus.heading)).toEqual([0, 90, 180, null, null]);
});
