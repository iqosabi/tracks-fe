import type { ApiRecord } from '../../core/types';
import { pick } from '../../shared/data/records';
import { busPositions, type BusPosition } from '../maps/data';
import { liveSchema, rowsSchema, type LiveData } from './contract';
import { liveRows, mapPositions } from './data';
import type { TmsClient } from './client';

const text = (value: unknown) => (typeof value === 'string' ? value : '');
function coordinate(value: unknown) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '')
    return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function masterPosition(row: ApiRecord): BusPosition | undefined {
  const operator = text(pick(row, 'operator.code', 'operatorCode'));
  return busPositions(
    [
      {
        deviceId: `${operator}:${text(row.id) || text(row.code)}`,
        bodyNo: text(row.code) || text(row.plateNumber),
        operatorCode: operator,
        routeCode: pick(row, 'assignedCorridor.code'),
        latitude: coordinate(row.lastGpsLat),
        longitude: coordinate(row.lastGpsLng),
        status: pick(row, 'deviceStatus', 'fleetStatus'),
        deviceTimestamp: row.lastGpsAt,
        // Master bus data has neither measured speed nor receive time. Leave both unknown.
      },
    ],
    [],
  )[0];
}
/** GPS and identity come exclusively from authorized live fleet/master bus responses. */
export function fleetMapPositions(live: LiveData | null, masters: ApiRecord[]): BusPosition[] {
  const index = new Map<string, ApiRecord>(),
    used = new Set<ApiRecord>();
  for (const row of masters) {
    const operator = text(pick(row, 'operator.code', 'operatorCode'));
    for (const identity of [text(row.id), text(row.code)].filter(Boolean))
      index.set(`${operator}:${identity}`, row);
  }
  const positions: BusPosition[] = [];
  for (const bus of live ? liveRows(live) : []) {
    const master = [bus.busId, bus.busCode, bus.vehicleNumber]
      .filter(Boolean)
      .map((identity) => index.get(`${bus.operatorCode ?? ''}:${identity}`))
      .find(Boolean);
    if (master) used.add(master);
    const enriched = { ...bus, busCode: bus.busCode || text(master?.code) || null };
    const position = mapPositions([enriched])[0];
    if (position) positions.push(position);
    else if (master) {
      const fallback = masterPosition(master);
      if (fallback)
        positions.push({
          ...fallback,
          id: `${bus.operatorCode}:${bus.busId}`,
          label: enriched.busCode || bus.vehicleNumber || bus.busId,
        });
    }
  }
  for (const master of masters) {
    if (used.has(master)) continue;
    const position = masterPosition(master);
    if (position) positions.push(position);
  }
  return [...new Map(positions.map((position) => [position.id, position])).values()];
}
export async function loadTmsMap(client: TmsClient, signal: AbortSignal) {
  const [live, masters] = await Promise.allSettled([
    client.read('live', signal).then((data) => liveSchema.parse(data)),
    client.read('fleets', signal).then((data) => rowsSchema.parse(data)),
  ]);
  signal.throwIfAborted();
  if (live.status === 'rejected' && masters.status === 'rejected') throw live.reason;
  return {
    positions: fleetMapPositions(
      live.status === 'fulfilled' ? live.value : null,
      masters.status === 'fulfilled' ? masters.value : [],
    ),
    notice:
      live.status === 'rejected'
        ? 'Armada live belum tersedia. Menampilkan GPS terakhir dari data master bus; waktu bus mengikuti waktu GPS terakhir.'
        : masters.status === 'rejected'
          ? 'Data master bus belum tersedia. Menampilkan posisi dari armada live.'
          : '',
  };
}
