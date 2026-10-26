export type ValueFormat =
  | 'day'
  | 'degrees'
  | 'text'
  | 'bytes'
  | 'date'
  | 'deviceDate'
  | 'boolean'
  | 'status'
  | 'number'
  | 'ms'
  | 'seconds'
  | 'coordinate'
  | 'speed'
  | 'percent'
  | 'meters';
export const number = (v: unknown, digits = 0): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'bigint') return v.toLocaleString('id-ID');
  if (typeof v === 'string' && /^-?\d+$/.test(v)) return BigInt(v).toLocaleString('id-ID');
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: digits }) : '—';
};
export function duration(seconds: unknown): string {
  if (
    (typeof seconds !== 'number' && typeof seconds !== 'string') ||
    (typeof seconds === 'string' && !seconds.trim())
  )
    return '—';
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return '—';
  const hundredths = Math.round(value * 100);
  if (!Number.isSafeInteger(hundredths)) return '—';
  const hours = Math.floor(hundredths / 360000);
  const minutes = Math.floor((hundredths % 360000) / 6000);
  const remainder = (hundredths % 6000) / 100;
  const parts: string[] = [];
  if (hours) parts.push(`${number(hours)} Jam`);
  if (minutes) parts.push(`${number(minutes)} Menit`);
  if (remainder || !parts.length) parts.push(`${number(remainder, 0)} Detik`);
  return parts.join(' ');
}
export function bytes(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  let n;
  try {
    if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) return '—';
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint')
      return '—';
    n = BigInt(value);
  } catch {
    return '—';
  }
  if (n < 0n) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let divisor = 1n,
    index = 0;
  while (n >= divisor * 1024n && index < units.length - 1) {
    divisor *= 1024n;
    index++;
  }
  if (!index) return number(n) + ' B';
  const hundredths = (n * 100n + divisor / 2n) / divisor;
  const fraction = String(hundredths % 100n)
    .padStart(2, '0')
    .replace(/0+$/, '');
  return number(hundredths / 100n) + (fraction ? ',' + fraction : '') + ' ' + units[index];
}
function validDate(value: unknown): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date))
  )
    return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}
export function time(value: unknown): string {
  const d = validDate(value);
  if (!d) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).formatToParts(d);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('hour')}:${part('minute')}:${part('second')}.${part('fractionalSecond')} WIB`;
}
export function deviceDate(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const parts =
    /^(\d{4}-\d{2}-\d{2})[T ]([0-2]\d:[0-5]\d:[0-5]\d)(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(
      value,
    );
  if (!parts || Number(parts[2].slice(0, 2)) > 23) return '—';
  // Use only the calendar date and clock supplied by the device, ignoring its zone suffix.
  const day = validDate(`${parts[1]}T00:00:00Z`);
  if (!day || day.toISOString().slice(0, 10) !== parts[1]) return '—';
  const label = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(day);
  return `${label} · ${parts[2]}`;
}
export function date(value: unknown): string {
  const d = validDate(value);
  return d
    ? new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).format(d) +
        ' · ' +
        time(d)
    : '—';
}
const statuses: Record<string, string> = {
  ACTIVE: 'Beroperasi',
  IDLE: 'Berhenti',
  DELAYED: 'Terlambat',
  DELAY: 'Terlambat',
  OFFLINE: 'Offline',
  OVERSPEED: 'Melebihi batas',
  OPEN: 'Terbuka',
  IN_PROGRESS: 'Ditangani',
  RESOLVED: 'Selesai',
  CLOSED: 'Ditutup',
  SUPER_ADMIN: 'Super admin',
  OPERATOR_ADMIN: 'Admin operator',
  OPERATOR_VIEWER: 'Viewer operator',
  true: 'Aktif',
  false: 'Nonaktif',
  OK: 'Normal',
  UP: 'Terhubung',
  READY: 'Siap',
  HEALTHY: 'Sehat',
  DOWN: 'Gangguan',
};
export const statusText = (value: unknown): string =>
  statuses[String(value)] || String(value ?? '—').replaceAll('_', ' ');
export function format(value: unknown, type: ValueFormat = 'text'): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'bytes') return bytes(value);
  if (type === 'date') return date(value);
  if (type === 'deviceDate') return deviceDate(value);
  if (type === 'day') {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? validDate(String(value) + 'T00:00:00+07:00')
      : null;
    return d
      ? new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }).format(d)
      : '—';
  }
  if (type === 'degrees') return number(value, 1) + '°';
  if (type === 'boolean') return value === true ? 'Aktif' : value === false ? 'Nonaktif' : '—';
  if (type === 'status') return statusText(value);
  if (type === 'number') return number(value);
  if (type === 'ms')
    return typeof value === 'number' || (typeof value === 'string' && value.trim())
      ? duration(Number(value) / 1000)
      : '—';
  if (type === 'seconds') return duration(value);
  if (type === 'coordinate') return number(value, 6);
  if (type === 'speed') return number(value, 0) + ' KM/J';
  if (type === 'percent') return number(value, 1) + '%';
  if (type === 'meters') return number(value, 1) + ' m';
  if (typeof value === 'number' || typeof value === 'bigint') return number(value, 2);
  return typeof value === 'object' ? '—' : String(value);
}
