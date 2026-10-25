import { withActivity } from '../activity/store';
import { time } from '../../shared/data/formatters';
import { z } from 'zod';
import { ApiError, responseError } from '../api/errors';
import { browserStorage, type StorageAdapter } from '../config/storage';
import { sessionSchema, tokenSchema, type Session, type User } from './schema';

export { ApiError } from '../api/errors';

export interface LockProvider {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}
export interface ChannelProvider {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(value: unknown): void;
  close(): void;
}
interface RestoreOptions {
  failedToken?: string;
  force?: boolean;
}
interface AuthOptions {
  base: string;
  fetcher?: typeof fetch;
  locks?: LockProvider | null;
  channel?: ChannelProvider | null;
  storage?: StorageAdapter | null;
  onChange?: (session: Session | null) => void;
}
export interface AuthClient {
  readonly user: User | null;
  restore(options?: RestoreOptions): Promise<Session>;
  login(username: string, password: string): Promise<Session>;
  logout(all?: boolean): Promise<void>;
  request(path: string, init?: RequestInit): Promise<Response>;
  close(): void;
}

const coordinationSchema = z.object({
  uncertain: z.boolean().optional(),
  retryAt: z.number().optional(),
});
const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('query') }),
  z.object({ type: z.literal('state'), value: sessionSchema.nullable() }),
  z.object({ type: z.literal('snapshot'), value: sessionSchema.nullable() }),
]);

function browserLocks(): LockProvider | null {
  if (!globalThis.navigator?.locks) return null;
  return { request: (name, callback) => navigator.locks.request(name, callback) };
}

/** Session tokens remain in memory; storage contains coordination markers only. */
export function createAuth(options: AuthOptions): AuthClient {
  const {
    base,
    fetcher: transport = fetch,
    locks = browserLocks(),
    storage = browserStorage(),
    onChange = () => {},
  } = options;
  const fetcher: typeof fetch = (input, init) => withActivity(() => transport(input, init));
  const channel =
    options.channel === undefined
      ? typeof BroadcastChannel === 'function'
        ? new BroadcastChannel(`tracks-cms-auth:${base}`)
        : null
      : options.channel;
  let current: Session | null = null;
  let pending: Promise<Session> | null = null;
  let epoch = 0;
  let closed = false;
  const key = `tracks-auth-coordination:${base}`;

  function update(value: Session | null, broadcast = true): void {
    if (closed) return;
    current = value;
    onChange(value);
    if (broadcast) channel?.postMessage({ type: 'state', value });
  }

  function marker(): z.infer<typeof coordinationSchema> {
    try {
      const value: unknown = JSON.parse(storage?.getItem(key) ?? '{}');
      return coordinationSchema.parse(value);
    } catch {
      return {};
    }
  }

  function mark(value: z.infer<typeof coordinationSchema>): void {
    try {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(key, JSON.stringify(value));
    } catch {
      throw new ApiError(
        'Penyimpanan koordinasi sesi tidak tersedia. Izinkan penyimpanan browser.',
      );
    }
  }

  if (channel)
    channel.onmessage = (event) => {
      if (closed) return;
      const parsed = messageSchema.safeParse(event.data);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === 'query') {
        if (current) channel.postMessage({ type: 'snapshot', value: current });
        return;
      }
      if (message.type === 'state' && !message.value) epoch++;
      update(message.value, false);
    };

  function exclusive<T>(callback: () => Promise<T>): Promise<T> {
    if (closed) return Promise.reject(new ApiError('Client autentikasi sudah ditutup.'));
    if (!locks)
      return Promise.reject(
        new ApiError('Browser memerlukan Web Locks melalui HTTPS atau localhost.'),
      );
    return locks.request(`tracks-cms-auth:${base}`, callback);
  }

  function assertCooldown(): void {
    const retryAt = marker().retryAt ?? 0;
    if (retryAt > Date.now())
      throw new ApiError(
        'Batas permintaan aktif. Coba lagi setelah ' + time(retryAt) + '.',
        429,
        retryAt,
      );
  }

  async function post(path: string, body?: unknown, token?: string): Promise<Response> {
    const headers = new Headers({ 'X-CSRF-Protection': '1' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await fetcher(`${base}/auth/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new ApiError('Tidak dapat terhubung ke CMS API. Periksa koneksi, URL API, dan CORS.');
    }
    if (!response.ok) {
      const error = responseError(response);
      if (error.status === 429) mark({ retryAt: error.retryAt });
      throw error;
    }
    return response;
  }

  async function readSession(response: Response): Promise<Session> {
    const payload: unknown = await response.json();
    const parsed = tokenSchema.safeParse(payload);
    if (!parsed.success) throw new ApiError('Format respons autentikasi tidak sesuai kontrak.');
    return { ...parsed.data, validUntil: Date.now() + parsed.data.expiresIn * 1_000 };
  }

  function restore({ failedToken, force = false }: RestoreOptions = {}): Promise<Session> {
    if (pending) return pending;
    pending = exclusive(async () => {
      assertCooldown();
      channel?.postMessage({ type: 'query' });
      if (channel) await new Promise<void>((resolve) => setTimeout(resolve, 100));
      if (
        current &&
        current.validUntil > Date.now() + 5_000 &&
        (!force || current.accessToken !== failedToken)
      )
        return current;
      if (marker().uncertain)
        throw new ApiError(
          'Hasil refresh sebelumnya belum dapat dipastikan. Masuk kembali untuk membuat sesi baru.',
        );
      const startEpoch = epoch;
      // Persist before sending: a lost response must never cause refresh-token replay.
      mark({ uncertain: true });
      let response: Response;
      try {
        response = await post('refresh');
      } catch (error) {
        if (error instanceof ApiError && error.status > 0 && error.status < 500) {
          if (error.status !== 429) mark({});
          if (error.status === 401) update(null);
        }
        throw error;
      }
      let session: Session;
      try {
        session = await readSession(response);
      } catch {
        throw new ApiError(
          'Respons refresh tidak dapat dibaca. Masuk kembali untuk membuat sesi baru.',
        );
      }
      if (closed || epoch !== startEpoch)
        throw new ApiError('Sesi telah berubah. Silakan masuk kembali.', 401);
      mark({});
      update(session);
      return session;
    }).finally(() => {
      pending = null;
    });
    return pending;
  }

  return {
    get user() {
      return current?.user ?? null;
    },
    restore,
    login: (username, password) =>
      exclusive(async () => {
        assertCooldown();
        const session = await readSession(await post('login', { username, password }));
        if (closed) throw new ApiError('Client autentikasi sudah ditutup.');
        mark({});
        epoch++;
        update(session);
        return session;
      }),
    logout: (all = false) =>
      exclusive(async () => {
        assertCooldown();
        if (all && !current) throw new ApiError('Masuk kembali untuk mengakhiri semua sesi.', 401);
        await post(
          all ? 'logout-all' : 'logout',
          undefined,
          all ? current?.accessToken : undefined,
        );
        // Server revocation is confirmed; storage failure must not keep UI authentication alive.
        try {
          mark({});
        } catch {
          /* Retaining a stale marker is safe after revocation. */
        }
        epoch++;
        update(null);
      }),
    async request(path, init = {}) {
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\'))
        throw new ApiError('API path harus relatif.');
      if (closed) throw new ApiError('Client autentikasi sudah ditutup.');
      if (!current) await restore();
      if (!current) throw new ApiError('Sesi berakhir. Silakan masuk kembali.', 401);
      const original = current.accessToken;
      const send = (token: string) => {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return fetcher(base + path, {
          ...init,
          headers,
          signal: init.signal ?? AbortSignal.timeout(20_000),
        });
      };
      const response = await send(original);
      if (response.status !== 401) return response;
      if (current?.accessToken === original) await restore({ failedToken: original, force: true });
      if (!current) return response;
      const retried = await send(current.accessToken);
      if (retried.status === 401) {
        epoch++;
        update(null);
      }
      return retried;
    },
    close() {
      closed = true;
      epoch++;
      channel?.close();
      current = null;
    },
  };
}
