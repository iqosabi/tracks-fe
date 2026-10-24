import type { ApiRecord } from '../../core/types';

export function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function record(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

export function recordIdValue(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

export function messageOf(error: unknown): string {
  if (!(error instanceof Error)) return 'Terjadi kesalahan. Silakan coba lagi.';
  if (error.name === 'AbortError') return 'Permintaan dibatalkan.';
  if (error.name === 'TimeoutError') return 'API tidak merespons. Silakan coba lagi.';
  if (error instanceof TypeError)
    return 'Koneksi API gagal. Periksa jaringan dan konfigurasi CORS.';
  if (error instanceof SyntaxError) return 'Respons API tidak dapat dibaca.';
  return error.message;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
