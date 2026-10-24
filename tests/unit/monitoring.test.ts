import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fleetPath, historyPath, listItems, flatten } from '../../src/features/monitoring/api';
test('vehicle requests use documented pagination, search, and status parameters', () => {
  assert.equal(
    fleetPath({ page: 2, limit: 25, q: 'B 123 & X', status: 'ACTIVE' }),
    '/monitoring/vehicles?page=2&limit=25&q=B+123+%26+X&status=ACTIVE',
  );
  assert.equal(fleetPath({ page: -1, limit: 999 }), '/monitoring/vehicles?page=1&limit=200');
});
test('history encodes device ID and limits results', () => {
  assert.equal(historyPath('device/1?x'), '/monitoring/vehicles/device%2F1%3Fx/history?limit=500');
});
test('unknown response shapes are distinguished from empty lists', () => {
  assert.equal(listItems({ other: [] }), null);
  assert.deepEqual(listItems({ items: [] }), []);
  assert.deepEqual(listItems({ data: { items: [{ deviceId: 'd1' }] } }), [{ deviceId: 'd1' }]);
});
test('adaptive fields preserve byte strings without lossy numeric conversion', () => {
  assert.deepEqual(flatten({ device: { id: 'd1' }, bytes: '9007199254740993123', latest: null }), {
    'device.id': 'd1',
    bytes: '9007199254740993123',
    latest: null,
  });
});
