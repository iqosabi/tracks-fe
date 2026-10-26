import type { ApiRecord } from '../../core/types';
import type { Column } from '../../shared/data/columns';
import type { ValueFormat } from '../../shared/data/formatters';
import { DataTableView } from '../../shared/ui/data-table/data-table';
const c = (label: string, key: string, type: ValueFormat = 'text'): Column => ({
  label,
  names: [key],
  type,
});
export const legacyColumns = {
  operatorSummary: [
    c('Operator', 'operatorCode'),
    c('Total bus', 'summary.totalBuses', 'number'),
    c('Beroperasi', 'summary.active', 'number'),
    c('Idle', 'summary.idle', 'number'),
    c('Stop', 'summary.stop', 'number'),
    c('Memiliki riwayat', 'summary.withHistory', 'number'),
    c('Tanpa riwayat', 'summary.withoutHistory', 'number'),
    c('Terakhir aktif', 'summary.lastActive', 'date'),
  ],
  live: [
    c('Bus', 'busId'),
    c('Kode bus', 'busCode'),
    c('Nomor kendaraan', 'vehicleNumber'),
    c('Operator', 'operatorCode'),
    c('Tipe', 'busType'),
    c('Status operasi', 'operationalStatus'),
    c('Perangkat', 'deviceStatus'),
    c('Koridor', 'corridorActive'),
    c('Speed', 'speed', 'speed'),
    c('Arah', 'heading', 'degrees'),
    c('Lat terakhir', 'lastPosition.lat', 'coordinate'),
    c('Lon terakhir', 'lastPosition.lon', 'coordinate'),
    c('Lat aktif', 'activePosition.lat', 'coordinate'),
    c('Lon aktif', 'activePosition.lon', 'coordinate'),
    c('Time bus', 'deviceTime', 'date'),
    c('Time server', 'serverTime', 'date'),
    c('Dipublikasikan', 'publishedTime', 'date'),
    c('Terakhir aktif', 'lastActive', 'date'),
    c('Jarak (km)', 'totalDistanceKm', 'number'),
    c('Status armada', 'fleetStatus'),
  ],
  fleets: [
    c('Bus', 'code'),
    c('Nomor polisi', 'plateNumber'),
    c('Tipe', 'type'),
    c('Status armada', 'fleetStatus'),
    c('Perangkat', 'deviceStatus'),
    c('Operator', 'operator.name'),
    c('Kode operator', 'operator.code'),
    c('Koridor', 'assignedCorridor.name'),
    c('Kode koridor', 'assignedCorridor.code'),
    c('Perangkat terpasang', 'device.description'),
    c('Check-in', 'lastCheckIn', 'date'),
    c('Terakhir aktif', 'lastActive', 'date'),
    c('Latitude', 'lastGpsLat', 'coordinate'),
    c('Longitude', 'lastGpsLng', 'coordinate'),
    c('Waktu GPS', 'lastGpsAt', 'date'),
    c('Jarak (km)', 'totalDistanceKm', 'number'),
    c('Dibuat', 'createdAt', 'date'),
    c('Diperbarui', 'updatedAt', 'date'),
  ],
  stations: [
    c('Halte', 'name'),
    c('Latitude', 'lat', 'coordinate'),
    c('Longitude', 'lng', 'coordinate'),
    c('Radius', 'radius', 'meters'),
    c('Pengumuman', 'stationText'),
    c('File audio', 'audioFile'),
    c('Koridor', 'corridorsText'),
  ],
  corridors: [
    c('Kode', 'code'),
    c('Koridor', 'name'),
    c('Tipe', 'type'),
    c('Jumlah halte', 'totalStations', 'number'),
  ],
  tenants: [
    c('Tenant', 'name'),
    c('Kode', 'code'),
    c('Alamat', 'address'),
    c('Aktif', 'isActive', 'boolean'),
    c('Interval', 'intervalTimeSec', 'seconds'),
    c('Armada', '_count.buses', 'number'),
    c('Pengguna', '_count.users', 'number'),
    c('Dibuat', 'createdAt', 'date'),
    c('Diperbarui', 'updatedAt', 'date'),
  ],
  tenantSummary: [
    c('Tenant', 'name'),
    c('Status', 'status'),
    c('Armada', 'totalFleets', 'number'),
    c('Pengguna', 'totalUsers', 'number'),
  ],
  menus: [
    c('Menu', 'title'),
    c('Parent', 'parentTitle'),
    c('Path', 'path'),
    c('Ikon', 'icon'),
    c('Urutan', 'sequence', 'number'),
    c('Role', 'rolesText'),
    c('Dibuat', 'createdAt', 'date'),
    c('Diperbarui', 'updatedAt', 'date'),
  ],
};
export function LegacyTable({ rows, columns }: { rows: ApiRecord[]; columns: Column[] }) {
  return (
    <section className="panel legacy-table">
      <DataTableView payload={rows} kind="legacy" columnDefinitions={columns} pageSize={10} />
    </section>
  );
}
