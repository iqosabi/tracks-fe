import type { ApiRecord } from '../../core/types';
import { busPositions } from '../maps/data';
import type { LiveBus, LiveData } from './contract';

export function liveRows(data: LiveData): LiveBus[] {
  // Operator + bus identity avoids collisions across tenants.
  const rows = new Map<string, LiveBus>();
  for (const group of data.byOperator)
    for (const bus of group.buses)
      rows.set(`${group.operatorCode}:${bus.busId}`, {
        ...bus,
        operatorCode: bus.operatorCode ?? group.operatorCode,
      });
  return [...rows.values()];
}
function validPosition(p: LiveBus['activePosition']) {
  return p && p.lat !== null && p.lon !== null && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
}
export function mapPositions(buses: LiveBus[]) {
  const normalized: ApiRecord[] = buses.map((bus) => {
    const position = validPosition(bus.activePosition)
      ? bus.activePosition
      : validPosition(bus.lastPosition)
        ? bus.lastPosition
        : null;
    return {
      deviceId: `${bus.operatorCode}:${bus.busId}`,
      bodyNo: bus.busCode || bus.vehicleNumber || bus.busId,
      operatorCode: bus.operatorCode,
      routeCode: bus.corridorActive,
      latitude: position?.lat,
      longitude: position?.lon,
      status: bus.operationalStatus,
      speedKmh: bus.speed,
      bearingDegrees: bus.heading,
      deviceTimestamp: bus.deviceTime,
      receivedAt: bus.serverTime,
    };
  });
  // HAR has no overspeed flag or speed limit: do not invent an alert threshold.
  // deviceTime already carries the device clock; display it without timezone conversion.
  return busPositions(normalized, []).map((position) => ({
    ...position,
    busTimeFormat: 'text' as const,
  }));
}
export function menuRows(rows: ApiRecord[], parent = ''): ApiRecord[] {
  return rows.flatMap((row) => [
    {
      ...row,
      parentTitle: parent || '—',
      rolesText: Array.isArray(row.roles) ? row.roles.join(', ') : '—',
    },
    ...menuRows(
      Array.isArray(row.children) ? (row.children as ApiRecord[]) : [],
      String(row.title ?? ''),
    ),
  ]);
}
