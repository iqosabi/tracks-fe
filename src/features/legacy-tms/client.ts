import { withActivity } from '../../core/activity/store';
import { ApiError } from '../../core/api/errors';
import { envelopeSchema, TMS_API_BASE, resources, type ResourceId } from './contract';
import { z } from 'zod';

const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) });
/** TMS credentials never enter CMS auth, cookies, URLs, or persistent browser storage. */
export class TmsClient {
  private accessToken: string;
  private refreshToken: string;
  private refreshing?: Promise<void>;
  private closed = new AbortController();

  constructor(
    accessToken: string,
    refreshToken = '',
    private transport: typeof fetch = (input, init) => fetch(input, init),
  ) {
    this.accessToken = accessToken.trim().replace(/^Bearer\s+/i, '');
    this.refreshToken = refreshToken.trim().replace(/^Bearer\s+/i, '');
    if (!this.accessToken || /\s/.test(this.accessToken) || /\s/.test(this.refreshToken))
      throw Error('Token TMS tidak valid.');
  }
  dispose() {
    this.closed.abort();
    this.accessToken = '';
    this.refreshToken = '';
  }
  private async send(path: string, token: string, signal?: AbortSignal, method = 'GET') {
    const response = await this.transport(TMS_API_BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
      signal: AbortSignal.any([
        this.closed.signal,
        AbortSignal.timeout(20000),
        ...(signal ? [signal] : []),
      ]),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    });
    return response;
  }
  private async renew() {
    if (!this.refreshToken) throw new ApiError('Sesi TMS berakhir. Hubungkan ulang.', 401);
    const response = await this.send('/auth/refresh', this.refreshToken, undefined, 'POST');
    if (!response.ok)
      throw new ApiError('Refresh sesi TMS gagal. Hubungkan ulang.', response.status);
    const body = envelopeSchema.parse(await response.json());
    if (!body.success) throw Error('Refresh sesi TMS ditolak.');
    const tokens = tokensSchema.parse(body.data);
    this.closed.signal.throwIfAborted();
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }
  read(resource: ResourceId, signal?: AbortSignal): Promise<unknown> {
    return withActivity(async () => {
      this.closed.signal.throwIfAborted();
      const sentToken = this.accessToken;
      let response = await this.send(resources[resource].path, sentToken, signal);
      if (response.status === 401 && this.refreshToken) {
        // Parallel reads share one refresh; late 401s reuse the already renewed token.
        if (sentToken === this.accessToken) {
          this.refreshing ??= this.renew().finally(() => {
            this.refreshing = undefined;
          });
          await this.refreshing;
        }
        signal?.throwIfAborted();
        response = await this.send(resources[resource].path, this.accessToken, signal);
      }
      if (!response.ok) {
        const message =
          response.status === 401
            ? 'Sesi TMS berakhir. Hubungkan ulang.'
            : response.status === 403
              ? 'Akun TMS tidak memiliki akses ke modul ini.'
              : `API TMS gagal (HTTP ${response.status}).`;
        throw new ApiError(message, response.status);
      }
      const result = envelopeSchema.safeParse(await response.json());
      if (!result.success || !result.data.success)
        throw Error('Format atau status respons TMS tidak sesuai rekaman.');
      return result.data.data;
    });
  }
}
