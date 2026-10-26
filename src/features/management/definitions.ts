import type { ApiRecord } from '../../core/types';
import type { Role } from '../../core/auth/schema';
import { recordIdValue } from '../../shared/data/guards';
import type { IconName } from '../../shared/ui/icons';
export type ModuleId =
  | 'operators'
  | 'buses'
  | 'routes'
  | 'devices'
  | 'tickets'
  | 'users'
  | 'audit'
  | 'usage'
  | 'history'
  | 'operatorSummary'
  | 'health'
  | 'account';
export type FieldType =
  | 'text'
  | 'boolean'
  | 'bus'
  | 'route'
  | 'operator'
  | 'device'
  | 'milliseconds'
  | 'number'
  | 'role'
  | 'ticketStatus'
  | 'password'
  | 'textarea'
  | 'datetime-local';
export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
}
export interface MutationDefinition {
  method: 'POST' | 'PATCH';
  fields: FieldSpec[];
  suffix?: string;
}
export interface ModuleDefinition {
  title: string;
  description: string;
  icon: IconName;
  path: string;
  kind: string;
  super?: boolean;
  search?: boolean;
  paginated?: boolean;
  create?: MutationDefinition;
  edit?: MutationDefinition;
  ownership?: boolean;
  remove?: boolean;
  detail?: boolean;
  rotate?: boolean;
  ticket?: boolean;
  idField?: string;
  filters?: FieldSpec[];
  tabs?: [string, string][];
  history?: boolean;
  health?: boolean;
  profile?: boolean;
}
export function isModuleId(value: string): value is ModuleId {
  return Object.hasOwn(modules, value);
}

// Fields, methods, paths, and permissions are derived from the supplied Postman collection.
const field = (
  key: string,
  label: string,
  type: FieldType = 'text',
  extra: Partial<FieldSpec> = {},
) => ({ key, label, type, ...extra });
const active = field('active', 'Status', 'boolean');
const busFields = [
  field('bodyNo', 'Nomor bus'),
  field('plateNo', 'Nomor polisi'),
  field('operator', 'Label operator'),
  field('model', 'Model'),
  active,
];
const deviceFields = [
  field('busId', 'Bus', 'bus'),
  field('label', 'Nama perangkat'),
  field('sendIntervalMs', 'Interval kirim (detik)', 'milliseconds'),
  field('gpsListenMs', 'Interval GPS (detik)', 'milliseconds'),
  field('configPollIntervalSec', 'Cek konfigurasi (detik)', 'number'),
];
const userFields = [
  field('role', 'Peran', 'role'),
  field('operatorId', 'Operator', 'operator'),
  active,
];
export const modules: Record<ModuleId, ModuleDefinition> = {
  operators: {
    title: 'Operator',
    description: 'Kelola operator serta kepemilikan bus dan akses rute.',
    icon: 'grid',
    path: '/cms/operators',
    kind: 'operators',
    super: true,
    search: true,
    paginated: true,
    create: {
      method: 'POST',
      fields: [field('code', 'Kode operator'), field('name', 'Nama operator')],
    },
    edit: { method: 'PATCH', fields: [field('name', 'Nama operator'), active] },
    ownership: true,
  },
  buses: {
    title: 'Master bus',
    description: 'Daftar bus, nomor polisi, model, dan status operasional.',
    icon: 'bus',
    path: '/cms/buses',
    kind: 'buses',
    search: true,
    paginated: true,
    create: { method: 'POST', fields: busFields },
    edit: { method: 'PATCH', fields: busFields },
    remove: true,
    detail: true,
  },
  routes: {
    title: 'Rute',
    description: 'Kelola kode dan nama rute perjalanan.',
    icon: 'pin',
    path: '/cms/routes',
    kind: 'routes',
    search: true,
    paginated: true,
    idField: 'code',
    create: { method: 'POST', fields: [field('code', 'Kode rute'), field('value', 'Nama rute')] },
    edit: { method: 'PATCH', fields: [field('value', 'Nama rute')] },
    remove: true,
  },
  devices: {
    title: 'Perangkat OBU',
    description: 'Kelola perangkat dan interval pengiriman telemetry.',
    icon: 'settings',
    path: '/cms/devices',
    kind: 'devices',
    search: true,
    paginated: true,
    create: { method: 'POST', fields: deviceFields },
    edit: { method: 'PATCH', fields: [...deviceFields, active] },
    remove: true,
    rotate: true,
  },
  tickets: {
    title: 'Tiket bantuan',
    description: 'Tinjau laporan pengemudi dan tindak lanjut bantuan.',
    icon: 'bell',
    path: '/cms/help-reports',
    kind: 'tickets',
    paginated: true,
    ticket: true,
    filters: [field('status', 'Status', 'ticketStatus'), field('deviceId', 'Perangkat', 'device')],
    edit: {
      method: 'PATCH',
      suffix: '/status',
      fields: [field('status', 'Status', 'ticketStatus'), field('note', 'Catatan', 'textarea')],
    },
  },
  users: {
    title: 'Pengguna',
    description: 'Kelola akun, peran, dan akses operator.',
    icon: 'shield',
    path: '/cms/users',
    kind: 'users',
    super: true,
    create: {
      method: 'POST',
      fields: [
        field('username', 'Username'),
        field('password', 'Password', 'password'),
        ...userFields.filter((f) => f.key !== 'active'),
      ],
    },
    edit: { method: 'PATCH', fields: userFields },
  },
  audit: {
    title: 'Log audit',
    description: 'Riwayat perubahan data dan aktivitas pengguna.',
    icon: 'clock',
    path: '/cms/audit',
    kind: 'audit',
    super: true,
    search: true,
    paginated: true,
  },
  usage: {
    title: 'Penggunaan internet',
    description: 'Pantau pemakaian data perangkat dan aplikasi.',
    icon: 'grid',
    path: '/monitoring/usage',
    kind: 'usage',
    paginated: true,
    filters: [
      field('deviceId', 'Perangkat', 'device'),
      field('from', 'Dari', 'datetime-local'),
      field('to', 'Sampai', 'datetime-local'),
    ],
    tabs: [
      ['Laporan', '/monitoring/usage'],
      ['Akumulasi perangkat', '/monitoring/usage/summary'],
    ],
  },
  history: {
    title: 'Riwayat GPS',
    description: 'Telusuri perjalanan perangkat hingga tujuh hari.',
    icon: 'pin',
    path: '/monitoring/vehicles',
    kind: 'history',
    history: true,
    filters: [
      field('deviceId', 'Perangkat', 'device'),
      field('from', 'Dari', 'datetime-local'),
      field('to', 'Sampai', 'datetime-local'),
    ],
  },
  operatorSummary: {
    title: 'Perbandingan operator',
    description: 'Bandingkan kondisi armada antaroperator.',
    icon: 'grid',
    path: '/monitoring/operators/summary',
    kind: 'operatorSummary',
    super: true,
  },
  health: {
    title: 'Status sistem',
    description: 'Periksa ketersediaan layanan dan koneksi database.',
    icon: 'shield',
    path: '/health',
    kind: 'health',
    health: true,
  },
  account: {
    title: 'Profil akun',
    description: 'Identitas akun, role, dan operator yang sedang aktif.',
    icon: 'user',
    path: '/auth/me',
    kind: 'profile',
    profile: true,
  },
};
export const moduleVisible = (id: string, role: Role | undefined) =>
  isModuleId(id) && (!modules[id].super || role === 'SUPER_ADMIN');
export const canWrite = (module: ModuleDefinition, role: Role) =>
  role === 'SUPER_ADMIN' || (!!module.ticket && role === 'OPERATOR_ADMIN');
export function recordId(
  row: ApiRecord,
  module: Pick<ModuleDefinition, 'idField'>,
): string | number | undefined {
  return recordIdValue(
    module.idField
      ? (row[module.idField] ?? row.routeCode)
      : (row.id ?? row.deviceId ?? row.busId ?? row.userId ?? row.helpReportId),
  );
}
export function recordPath(module: ModuleDefinition, id: unknown) {
  return module.path + '/' + encodeURIComponent(String(id));
}
export function validateDates(
  values: Record<string, string>,
  { history = false }: { history?: boolean } = {},
) {
  const from = values.from ? new Date(values.from) : null,
    to = values.to ? new Date(values.to) : new Date();
  if ((from && Number.isNaN(from.getTime())) || Number.isNaN(to.getTime()))
    throw Error('Tanggal tidak valid.');
  if (from && from > to) throw Error('Tanggal mulai harus sebelum tanggal akhir.');
  if (history && from && to.getTime() - from.getTime() > 7 * 86400000)
    throw Error('Rentang riwayat GPS maksimal tujuh hari.');
  return {
    ...values,
    ...(from ? { from: from.toISOString() } : {}),
    ...(values.to ? { to: to.toISOString() } : {}),
  };
}
export function buildListPath(
  module: ModuleDefinition,
  {
    page = 1,
    limit = 25,
    q = '',
    filters = {},
    path = module.path,
  }: {
    page?: number;
    limit?: number;
    q?: string;
    filters?: Record<string, string>;
    path?: string;
  } = {},
) {
  const args = new URLSearchParams();
  if (module.paginated) {
    args.set('page', String(page));
    args.set('limit', String(limit));
  }
  if (q && module.search) args.set('q', q);
  for (const [k, v] of Object.entries(filters))
    if (v !== '' && v !== undefined && v !== null) args.set(k, String(v));
  return path + (args.size ? '?' + args : '');
}
