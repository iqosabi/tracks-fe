import type { ApiRecord } from '../../core/types';
import { items, pick, vehicleName } from '../../shared/data/records';
import { record } from '../../shared/data/guards';
import type { FleetPosition } from './fleet-map';
import { format } from '../../shared/data/formatters';
export interface BusPosition extends FleetPosition {
  id: string;
  operatorLabel?: string;
  routeCode?: string;
  overspeed: boolean;
  speed: number | null;
  busTime: unknown;
  delayMs: number | null;
}
export const defaultOfflineAfterMs = 90_000;
export function offlineAfterMs(payload: unknown): number {
  const root = record(payload);
  const data = record(root.data ?? root);
  const seconds = numeric(record(data.thresholds).offlineSec);
  return seconds !== null && seconds > 0 && Number.isFinite(seconds * 1000)
    ? seconds * 1000
    : defaultOfflineAfterMs;
}
export function withBusFreshness(
  bus: BusPosition,
  now: number,
  thresholdMs = defaultOfflineAfterMs,
): BusPosition {
  if (
    typeof bus.busTime !== 'string' &&
    typeof bus.busTime !== 'number' &&
    !(bus.busTime instanceof Date)
  )
    return bus;
  if (typeof bus.busTime === 'string' && !bus.busTime.trim()) return bus;
  const timestamp = new Date(bus.busTime).getTime();
  const ageMs = now - timestamp;
  if (!Number.isFinite(ageMs) || ageMs < thresholdMs) return bus;
  return { ...bus, status: 'OFFLINE', delayMs: ageMs, overspeed: false };
}
function numeric(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value !== 'string' && typeof value !== 'number')
  )
    return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function alertRows(payload: unknown): ApiRecord[] {
  const rows = items(payload);
  if (rows) return rows;
  const root = record(payload),
    data = record(root.data ?? root);
  return Object.entries(data).flatMap(([type, values]) =>
    Array.isArray(values)
      ? values.map((value) => ({
          ...record(value),
          type: record(value).type ?? type.replace(/vehicles|alerts/gi, '').toUpperCase(),
        }))
      : [],
  );
}
function identity(row: unknown): string {
  return String(pick(row, 'deviceId', 'device.id', 'id') ?? '');
}
export function isOverspeed(row: unknown): boolean {
  const flag = pick(row, 'isOverspeed', 'overspeed');
  if (flag === true || flag === 'true') return true;
  if (String(pick(row, 'type', 'alertType', 'status')).toUpperCase() === 'OVERSPEED') return true;
  const speed = numeric(pick(row, 'speedKph', 'speedKmh', 'speed'));
  const limit = numeric(pick(row, 'speedLimitKph', 'speedLimitKmh', 'speedLimit'));
  return speed !== null && limit !== null && limit > 0 && speed > limit;
}
export function busPositions(rows: ApiRecord[], alerts: unknown): BusPosition[] {
  const overspeedIds = new Set(alertRows(alerts).filter(isOverspeed).map(identity).filter(Boolean));
  return rows.flatMap((row) => {
    const lat = numeric(pick(row, 'latitude', 'lat')),
      lng = numeric(pick(row, 'longitude', 'lng', 'lon'));
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
    const id = identity(row) || `${String(vehicleName(row))}:${lat}:${lng}`;
    const busTime = pick(
      row,
      'deviceTimestamp',
      'deviceTime',
      'busTime',
      'recordedAt',
      'timestamp',
      'gpsTime',
      'lastSeenAt',
    );
    const receivedAt = pick(row, 'receivedAt', 'serverTime');
    let delayMs = numeric(pick(row, 'delayMs', 'latencyMs', 'telemetryDelayMs'));
    if (delayMs === null) {
      const seconds = numeric(pick(row, 'delaySeconds', 'delaySec'));
      if (seconds !== null) delayMs = seconds * 1000;
    }
    if (delayMs === null && busTime && receivedAt) {
      const delta = new Date(String(receivedAt)).getTime() - new Date(String(busTime)).getTime();
      if (Number.isFinite(delta) && delta >= 0) delayMs = delta;
    }
    return [
      {
        id,
        operatorLabel: String(
          pick(row, 'operatorName', 'operator.name', 'operatorCode', 'operator') ?? '',
        ),
        routeCode: String(pick(row, 'routeCode') ?? ''),
        lat,
        lng,
        heading: numeric(pick(row, 'bearingDegrees', 'heading', 'bearing', 'course')),
        label: String(vehicleName(row) ?? 'Kendaraan'),
        status: String(pick(row, 'status') ?? ''),
        overspeed: isOverspeed(row) || overspeedIds.has(id),
        speed: numeric(pick(row, 'speedKph', 'speedKmh', 'speed')),
        busTime,
        delayMs,
      },
    ];
  });
}
export function delayText(ms: number | null): string {
  return format(ms, 'ms');
}
