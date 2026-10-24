import type { Role } from '../../core/auth/schema';
import { pick, items } from '../../shared/data/records';
import { record } from '../../shared/data/guards';
import { number, bytes } from '../../shared/data/formatters';
export interface Metric {
  label: string;
  value: string;
  error?: string;
}
export interface CountSource {
  label: string;
  path: string;
  unpaginated?: boolean;
}
export function countSources(role: Role): CountSource[] {
  const common = [
    { label: 'Bus terdaftar', path: '/cms/buses?page=1&limit=1' },
    { label: 'Rute', path: '/cms/routes?page=1&limit=1' },
    { label: 'Perangkat', path: '/cms/devices?page=1&limit=1' },
    { label: 'Laporan bantuan', path: '/cms/help-reports?page=1&limit=1' },
    { label: 'Laporan terbuka', path: '/cms/help-reports?page=1&limit=1&status=OPEN' },
    { label: 'Laporan ditangani', path: '/cms/help-reports?page=1&limit=1&status=IN_PROGRESS' },
  ];
  return role === 'SUPER_ADMIN'
    ? [
        ...common,
        { label: 'Operator', path: '/cms/operators?page=1&limit=1' },
        { label: 'Pengguna', path: '/cms/users', unpaginated: true },
        { label: 'Aktivitas audit', path: '/cms/audit?page=1&limit=1' },
      ]
    : common;
}
export function totalCount(payload: unknown, unpaginated = false): string {
  if (unpaginated) {
    const rows = items(payload);
    return rows ? number(rows.length) : '—';
  }
  const root = record(payload),
    data = record(root.data);
  for (const candidate of [root.pagination, root.meta, data.pagination, data.meta, root, data]) {
    const obj = record(candidate),
      value = obj.total ?? obj.totalItems ?? obj.totalCount;
    if (
      (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) ||
      (typeof value === 'string' && /^\d+$/.test(value))
    )
      return number(value);
  }
  return '—'; // A page length is never a fleet-wide total.
}
export function fleetMetrics(payload: unknown): Metric[] {
  const definitions: [string, string[]][] = [
    ['Total armada', ['total', 'totalVehicles', 'vehicleCount', 'totalCount']],
    ['Beroperasi', ['active', 'activeCount']],
    ['Berhenti', ['idle', 'idleCount']],
    ['Terlambat', ['delayed', 'delayedCount']],
    ['Offline', ['offline', 'offlineCount']],
    ['Overspeed', ['overspeed', 'overspeedCount']],
  ];
  const metrics = definitions.map(([label, keys]) => ({
    label,
    value: (() => {
      const v = pick(payload, ...keys);
      return (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) ||
        (typeof v === 'string' && /^\d+$/.test(v))
        ? number(v)
        : '—';
    })(),
  }));
  const usage = pick(payload, 'totalBytes', 'usageBytes');
  if (usage !== undefined) metrics.push({ label: 'Pemakaian data', value: bytes(usage) });
  return metrics;
}
