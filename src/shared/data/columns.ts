import type { ValueFormat } from './formatters';
export interface Column {
  label: string;
  names: string[];
  type: ValueFormat;
}
const col = (label: string, names: string[], type: ValueFormat = 'text'): Column => ({
  label,
  names,
  type,
});
const vehicle = [
  col('Kendaraan', ['bus.bodyNo', 'bodyNo', 'busBodyNo', 'label', 'device.label']),
  col('Nomor polisi', ['bus.plateNo', 'plateNo', 'plate', 'licensePlate']),
  col('Operator', ['operator.name', 'operatorName', 'bus.operator', 'operator']),
  col('Status', ['status', 'state'], 'status'),
  col('Kecepatan', ['speedKph', 'speedKmh', 'speed'], 'speed'),
  col('Baterai', ['batteryPercent', 'batteryLevel', 'battery'], 'percent'),
  col(
    'Terakhir terpantau',
    ['receivedAt', 'lastSeenAt', 'lastSeen', 'timestamp', 'recordedAt'],
    'date',
  ),
];
export const columns: Record<string, Column[]> = {
  vehicles: vehicle,
  alerts: [
    col('Kendaraan', ['bodyNo', 'busBodyNo', 'label', 'deviceName']),
    col('Peringatan', ['type', 'alertType', 'status'], 'status'),
    col('Keterangan', ['message', 'description', 'reason']),
    col('Kecepatan', ['speedKph', 'speed'], 'speed'),
    col('Waktu', ['lastSeenAt', 'receivedAt', 'createdAt', 'timestamp'], 'date'),
  ],
  buses: [
    col('Nomor bus', ['bodyNo']),
    col('Nomor polisi', ['plateNo', 'plate']),
    col('Operator', ['operator.name', 'operatorName', 'operator']),
    col('Model', ['model']),
    col('Status', ['active'], 'boolean'),
  ],
  routes: [
    col('Kode rute', ['code', 'routeCode']),
    col('Rute', ['value', 'routeName', 'name']),
    col('Status', ['active'], 'boolean'),
  ],
  devices: [
    col('Perangkat', ['label', 'deviceName']),
    col('Nomor bus', ['bodyNo', 'busBodyNo']),
    col('Nomor polisi', ['plateNo']),
    col('Interval kirim', ['sendIntervalMs'], 'ms'),
    col('Interval GPS', ['gpsListenMs'], 'ms'),
    col('Cek konfigurasi', ['configPollIntervalSec'], 'seconds'),
    col('Status', ['active'], 'boolean'),
  ],
  operators: [
    col('Operator', ['name', 'operatorName']),
    col('Kode', ['code', 'operatorCode']),
    col('Bus', ['busCount'], 'number'),
    col('Perangkat', ['deviceCount'], 'number'),
    col('Status', ['active'], 'boolean'),
  ],
  tickets: [
    col('Kendaraan', ['bodyNo', 'busBodyNo', 'device.label', 'label']),
    col('Pengemudi', ['driverName', 'driver.name']),
    col('Laporan', ['message', 'description', 'report', 'note']),
    col('Status', ['status'], 'status'),
    col('Dibuat', ['createdAt', 'reportedAt'], 'date'),
  ],
  users: [
    col('Username', ['username']),
    col('Peran', ['role'], 'status'),
    col('Operator', ['operator.name', 'operatorName']),
    col('Status', ['active'], 'boolean'),
    col('Dibuat', ['createdAt'], 'date'),
  ],
  audit: [
    col('Pengguna', ['actor.username', 'username', 'actorUsername']),
    col('Aktivitas', ['action', 'event']),
    col('Modul', ['entityType', 'resourceType', 'resource', 'entity']),
    col('Operator', ['operator.name', 'operatorName']),
    col('Waktu', ['createdAt', 'timestamp'], 'date'),
  ],
  usage: [
    col('Perangkat', ['device.label', 'label', 'deviceName', 'bodyNo', 'busBodyNo']),
    col('Aplikasi', ['appName', 'packageName', 'application']),
    col('Total data', ['totalBytes', 'bytes', 'deviceBytes', 'totalDeviceBytes'], 'bytes'),
    col('Data aplikasi', ['appBytes', 'totalAppBytes'], 'bytes'),
    col('Unduh', ['rxBytes', 'downloadBytes', 'receivedBytes'], 'bytes'),
    col('Unggah', ['txBytes', 'uploadBytes', 'sentBytes'], 'bytes'),
    col('Waktu', ['reportedAt', 'createdAt', 'timestamp', 'from', 'periodStart'], 'date'),
  ],
  history: [
    col('Waktu', ['recordedAt', 'receivedAt', 'timestamp'], 'date'),
    col('Latitude', ['latitude', 'lat'], 'coordinate'),
    col('Longitude', ['longitude', 'lng', 'lon'], 'coordinate'),
    col('Kecepatan', ['speedKph', 'speed'], 'speed'),
    col('Akurasi', ['accuracy', 'accuracyMeters'], 'meters'),
  ],
  operatorSummary: [
    col('Operator', ['operatorName', 'operator.name', 'name']),
    col('Total', ['total', 'totalVehicles', 'vehicleCount'], 'number'),
    col('Beroperasi', ['active', 'activeCount'], 'number'),
    col('Berhenti', ['idle', 'idleCount'], 'number'),
    col('Terlambat', ['delayed', 'delayedCount'], 'number'),
    col('Offline', ['offline', 'offlineCount'], 'number'),
  ],
};
