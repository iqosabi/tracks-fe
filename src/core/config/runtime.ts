import { z } from 'zod';
import { readPreference, writePreference, removePreference } from './storage.ts';

const defaultBase = 'https://tracksmon-dev-api.aestaworks.com/api/v1';
export const cartoKeySchema = z.string().regex(/^cb1_[A-Za-z0-9_-]+$/);
export interface PublicConfig {
  apiBaseUrl?: string;
  cartoApiKey?: string;
}

export function normalizeApiBase(value: string): string {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
    throw new Error('CMS API harus menggunakan HTTPS, kecuali localhost.');
  if (url.username || url.password || url.search || url.hash)
    throw new Error('Gunakan URL tanpa kredensial, query, atau fragment.');
  return url.href.replace(/\/+$/, '');
}

export function readConfig(): { cmsBase: string } {
  const runtime = globalThis.TRACKS_PUBLIC_CONFIG;
  const configured = runtime?.apiBaseUrl ?? defaultBase;
  try {
    const saved: unknown = JSON.parse(readPreference('tracks-config') ?? '{}');
    const parsed = z.object({ cmsBase: z.string().optional() }).parse(saved);
    return { cmsBase: normalizeApiBase(parsed.cmsBase ?? configured) };
  } catch {
    return { cmsBase: normalizeApiBase(configured) };
  }
}

export function saveApiBase(value: string): void {
  writePreference('tracks-config', JSON.stringify({ cmsBase: normalizeApiBase(value) }));
}

export function getCartoKey(): string {
  const value =
    readPreference('tracks-carto-key') ?? globalThis.TRACKS_PUBLIC_CONFIG?.cartoApiKey ?? '';
  const parsed = cartoKeySchema.safeParse(value);
  return parsed.success ? parsed.data : '';
}

export function saveCartoKey(value: string): void {
  const parsed = cartoKeySchema.safeParse(value.trim());
  if (!parsed.success) throw new Error('Masukkan CARTO Basemaps API key yang valid.');
  writePreference('tracks-carto-key', parsed.data);
}

export function clearCartoKey(): void {
  removePreference('tracks-carto-key');
}
