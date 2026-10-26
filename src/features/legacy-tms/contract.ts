import { z } from 'zod';

export const TMS_API_BASE = 'https://api-tms.aestaworks.com/api';
/** Only successful read endpoints observed in the uploaded HAR. */
export const resources = {
  live: { title: 'Armada live', path: '/fleets/live-status', group: 'Operasional' },
  fleets: { title: 'Master armada', path: '/fleets', group: 'Operasional' },
  stations: { title: 'Halte', path: '/operationals/stations', group: 'Operasional' },
  corridors: { title: 'Koridor', path: '/operationals/corridors', group: 'Operasional' },
  tenantSummary: { title: 'Ringkasan tenant', path: '/tenants/summary', group: 'Administrasi' },
  tenants: { title: 'Tenant', path: '/tenants', group: 'Administrasi' },
  myMenus: { title: 'Menu akses saya', path: '/menus/me', group: 'Administrasi' },
  menus: { title: 'Daftar menu', path: '/menus', group: 'Administrasi' },
} as const;
export type ResourceId = keyof typeof resources;
export type LegacyPage = ResourceId | 'map';
export const envelopeSchema = z.object({
  success: z.boolean(),
  metadata: z.unknown().optional(),
  data: z.unknown(),
});
export const loginCredentialsSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});
export const tmsUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.email(),
  role: z.string(),
  operatorId: z.string().nullable(),
  phoneNumber: z.string().nullable().optional(),
});
export const loginDataSchema = z.object({
  user: tmsUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type TmsUser = z.infer<typeof tmsUserSchema>;
export const rowSchema = z.record(z.string(), z.unknown());
export const rowsSchema = z.array(rowSchema);
const nullableNumber = z.number().finite().nullable();
const nullableText = z.string().nullable();
const positionSchema = z.object({ lat: nullableNumber, lon: nullableNumber });
export const liveBusSchema = z.object({
  operatorCode: nullableText,
  busId: z.string(),
  busCode: nullableText,
  vehicleNumber: nullableText,
  busType: nullableText,
  operationalStatus: nullableText,
  deviceStatus: nullableText,
  speed: nullableNumber,
  heading: nullableNumber,
  corridorActive: nullableText,
  lastPosition: positionSchema.nullable(),
  activePosition: positionSchema.nullable(),
  deviceTime: nullableText,
  serverTime: nullableText,
  publishedTime: nullableText,
  lastActive: nullableText,
  totalDistanceKm: nullableNumber,
  fleetStatus: nullableText,
});
export const summarySchema = z.object({
  totalBuses: z.number(),
  active: z.number(),
  idle: z.number(),
  stop: z.number(),
  withHistory: z.number(),
  withoutHistory: z.number(),
  lastActive: nullableText,
});
export const liveSchema = z.object({
  source: z.string(),
  scope: z.string(),
  operatorCode: nullableText,
  generatedAt: z.string(),
  summary: summarySchema,
  totalOperators: z.number(),
  byOperator: z.array(
    z.object({
      operatorCode: z.string(),
      summary: summarySchema,
      buses: z.array(liveBusSchema),
    }),
  ),
});
export const tenantSummarySchema = z.object({ overview: rowSchema, breakdown: rowsSchema });
export type LiveData = z.infer<typeof liveSchema>;
export type LiveBus = z.infer<typeof liveBusSchema>;
