import { withActivity } from '../activity/store';
import type { AuthClient } from '../auth/client';
import { ApiError, responseError } from './errors';

export interface ApiClient {
  request(path: string, init?: RequestInit): Promise<unknown>;
}
const clients = new WeakMap<AuthClient, ApiClient>();

/** Shared cooldown and error handling for all protected feature requests. */
export function apiFor(auth: AuthClient): ApiClient {
  const existing = clients.get(auth);
  if (existing) return existing;
  let retryAt = 0;
  const client: ApiClient = {
    async request(path, init = {}) {
      return withActivity(async () => {
        if (retryAt > Date.now())
          throw new ApiError('Batas permintaan aktif. Silakan tunggu.', 429, retryAt);
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/json');
        if (init.body !== undefined && !headers.has('Content-Type'))
          headers.set('Content-Type', 'application/json');
        const timeout = AbortSignal.timeout(20_000);
        const mutating = !['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase());
        let response: Response;
        try {
          response = await auth.request(path, {
            ...init,
            headers,
            signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
          });
        } catch (error) {
          if (
            mutating &&
            (error instanceof TypeError ||
              (error instanceof Error && error.name === 'TimeoutError'))
          ) {
            throw new ApiError(
              'Hasil perubahan belum dapat dipastikan. Periksa daftar data sebelum mengirim ulang.',
            );
          }
          throw error;
        }
        if (!response.ok) {
          const error = responseError(response);
          if (error.status === 429) retryAt = error.retryAt;
          throw error;
        }
        if (response.status === 204) return null;
        const text = await response.text();
        if (!text) return null;
        try {
          const payload: unknown = JSON.parse(text);
          return payload;
        } catch {
          throw new ApiError(
            mutating
              ? 'Perubahan diterima, tetapi respons tidak dapat dibaca. Periksa daftar data sebelum mengirim ulang.'
              : 'Respons API tidak berupa JSON yang valid.',
          );
        }
      });
    },
  };
  clients.set(auth, client);
  return client;
}
