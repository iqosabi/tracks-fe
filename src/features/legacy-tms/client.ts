import { withActivity } from '../../core/activity/store';
import { ApiError } from '../../core/api/errors';
import {
  envelopeSchema,
  loginCredentialsSchema,
  loginDataSchema,
  TMS_API_BASE,
  resources,
  type ResourceId,
} from './contract';
import { z } from 'zod';

const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) });
/** TMS credentials never enter CMS auth, cookies, URLs, or persistent browser storage. */
export class TmsClient {
  static login(
    credentials: { email: string; password: string },
    signal: AbortSignal,
    transport: typeof fetch = (input, init) => fetch(input, init),
  ) {
    return withActivity(async () => {
      const input = loginCredentialsSchema.safeParse(credentials);
      if (!input.success) throw Error('Isi email dan password yang valid.');
      const response = await transport(TMS_API_BASE + '/auth/login', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(input.data),
        signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
      });
      if (!response.ok)
        throw new ApiError(
          [400, 401, 403].includes(response.status)
            ? 'Email atau password tidak valid, atau akun tidak diizinkan masuk.'
            : response.status === 429
              ? 'Terlalu banyak percobaan login. Coba lagi nanti.'
              : 'Login TMS gagal. Coba lagi nanti.',
          response.status,
        );
      const envelope = envelopeSchema.safeParse(await response.json());
      if (!envelope.success || !envelope.data.success)
        throw Error('Login TMS ditolak. Periksa email dan password.');
      const result = loginDataSchema.safeParse(envelope.data.data);
      if (!result.success) throw Error('Respons login TMS tidak sesuai kontrak.');
      signal.throwIfAborted();
      const { user, accessToken, refreshToken } = result.data;
      return { client: new TmsClient(accessToken, refreshToken, transport), user };
    });
  }
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
    if (!this.refreshToken) throw new ApiError('Sesi TMS berakhir. Silakan masuk kembali.', 401);
    const response = await this.send('/auth/refresh', this.refreshToken, undefined, 'POST');
    if (!response.ok)
      throw new ApiError('Refresh sesi TMS gagal. Silakan masuk kembali.', response.status);
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
            ? 'Sesi TMS berakhir. Silakan masuk kembali.'
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
