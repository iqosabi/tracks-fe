import { useMemo, useState } from 'react';
import type { ApiRecord } from '../../core/types';
import { pick } from '../../shared/data/records';
import { format, number, type ValueFormat } from '../../shared/data/formatters';

type Column = { label: string; key: string; type?: ValueFormat };
const c = (label: string, key: string, type?: ValueFormat): Column => ({ label, key, type });
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
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id-ID');
    return needle
      ? rows.filter((row) =>
          columns.some((column) =>
            format(pick(row, column.key), column.type ?? 'text')
              .toLocaleLowerCase('id-ID')
              .includes(needle),
          ),
        )
      : rows;
  }, [rows, columns, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const current = Math.min(page, pages),
    offset = (current - 1) * limit;
  return (
    <section className="legacy-table">
      <div className="legacy-table-tools">
        <label>
          Cari data
          <input
            type="search"
            value={query}
            placeholder="Cari di kolom yang ditampilkan…"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Baris per halaman
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(offset, offset + limit).map((row, index) => (
              <tr key={offset + index}>
                <td>{number(offset + index + 1)}</td>
                {columns.map((column) => (
                  <td key={column.key}>{format(pick(row, column.key), column.type ?? 'text')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length ? (
        <p className="monitor-empty">Tidak ada data untuk pencarian ini.</p>
      ) : null}
      <footer className="legacy-pagination">
        <span>
          {number(filtered.length)} data · Halaman {number(current)} / {number(pages)}
        </span>
        <button className="button" disabled={current <= 1} onClick={() => setPage(current - 1)}>
          Sebelumnya
        </button>
        <button className="button" disabled={current >= pages} onClick={() => setPage(current + 1)}>
          Berikutnya
        </button>
      </footer>
    </section>
  );
}
