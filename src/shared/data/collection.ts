import type { ApiClient } from '../../core/api/client';
import type { ApiRecord } from '../../core/types';
import { items } from './records';
import { paginationMeta } from './pagination';
export interface CollectionResult {
  rows: ApiRecord[];
  complete: boolean;
}
/** Explicitly follows hasMore; never treats a short server-capped page as the final page. */
export async function readCollection(
  api: ApiClient,
  endpoint: string,
  signal: AbortSignal,
  maxPages = 25,
): Promise<CollectionResult> {
  const rows: ApiRecord[] = [];
  const [path, query = ''] = endpoint.split('?');
  const parameters = new URLSearchParams(query);
  const limit = Number(parameters.get('limit') ?? 200);
  for (let page = 1; page <= maxPages; page++) {
    parameters.set('page', String(page));
    parameters.set('limit', String(limit));
    const payload = await api.request(path + '?' + parameters, { signal });
    const batch = items(payload);
    if (batch === null) throw new Error('Format daftar API tidak dikenali.');
    rows.push(...batch);
    if (!paginationMeta(payload, page, limit, batch.length).hasNext)
      return { rows, complete: true };
    if (!batch.length)
      throw new Error('API mengirim halaman kosong tetapi masih menyatakan ada data berikutnya.');
  }
  return { rows, complete: false };
}
