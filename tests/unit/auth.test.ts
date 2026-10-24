import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createAuth, type LockProvider, type ChannelProvider } from '../../src/core/auth/client';

import { ApiError } from '../../src/core/api/errors';
type AuthOptions = Parameters<typeof createAuth>[0];
type MockFetch = (url: string, init: RequestInit) => Promise<Response>;
const base = 'https://cms.example.test/api/v1';
const token = (id = 'one') => ({
  accessToken: id,
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshExpiresAt: '2026-10-30T03:00:00Z',
  user: { id: 'u1', username: 'operator', role: 'OPERATOR_VIEWER', operatorId: 'op1' },
});
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}
function locks(): LockProvider {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    request<T>(_name: string, fn: () => Promise<T>): Promise<T> {
      const next = queue.then(fn);
      queue = next.catch(() => {});
      return next;
    },
  };
}
function client(fetcher: MockFetch, extra: Partial<AuthOptions> = {}) {
  return createAuth({
    base,
    fetcher: (input, init) =>
      fetcher(input instanceof Request ? input.url : String(input), init ?? {}),
    storage: storage(),
    locks: locks(),
    channel: null,
    ...extra,
  });
}

test('login follows the cookie/CSRF contract and retains no token in storage', async () => {
  const persisted = storage();
  let request: ({ url: string } & RequestInit) | undefined;
  const auth = client(
    async (url, init) => {
      request = { url, ...init };
      return json(token(), 201);
    },
    { storage: persisted },
  );
  await auth.login('operator', 'example-test-password');
  assert.ok(request);
  assert.equal(request.url, base + '/auth/login');
  assert.equal(request.credentials, 'include');
  assert.equal(new Headers(request.headers).get('X-CSRF-Protection'), '1');
  assert.equal(new Headers(request.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(request.body)), {
    username: 'operator',
    password: 'example-test-password',
  });
  assert.equal(auth.user?.role, 'OPERATOR_VIEWER');
  assert.equal(persisted.getItem('tracks-auth-coordination:' + base), '{}');
});
test('parallel 401s perform one refresh and retry each request once', async () => {
  let refreshes = 0,
    protectedCalls = 0;
  const auth = client(async (url, init) => {
    if (url.endsWith('/auth/login')) return json(token('old'), 201);
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((r) => setTimeout(r, 10));
      return json(token('new'));
    }
    protectedCalls++;
    return new Headers(init.headers).get('Authorization') === 'Bearer old'
      ? json({}, 401)
      : json({ ok: true });
  });
  await auth.login('operator', 'test');
  const responses = await Promise.all([
    auth.request('/one'),
    auth.request('/two'),
    auth.request('/three'),
  ]);
  assert.equal(refreshes, 1);
  assert.equal(protectedCalls, 6);
  assert.ok(responses.every((r) => r.status === 200));
});
test('403 does not trigger refresh', async () => {
  let refreshes = 0;
  const auth = client(async (url) => {
    if (url.endsWith('/auth/login')) return json(token(), 201);
    if (url.endsWith('/auth/refresh')) refreshes++;
    return json({}, 403);
  });
  await auth.login('operator', 'test');
  assert.equal((await auth.request('/restricted')).status, 403);
  assert.equal(refreshes, 0);
  assert.ok(auth.user);
});
test('a second 401 clears memory without a second retry', async () => {
  let calls = 0;
  const auth = client(async (url) => {
    if (url.endsWith('/auth/login')) return json(token('old'), 201);
    if (url.endsWith('/auth/refresh')) return json(token('new'));
    calls++;
    return json({}, 401);
  });
  await auth.login('operator', 'test');
  assert.equal((await auth.request('/private')).status, 401);
  assert.equal(calls, 2);
  assert.equal(auth.user, null);
});
test('refresh 401 clears the session', async () => {
  const auth = client(async (url) =>
    url.endsWith('/auth/login') ? json(token(), 201) : json({}, 401),
  );
  await auth.login('operator', 'test');
  await assert.rejects(
    auth.restore({ force: true, failedToken: 'one' }),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(auth.user, null);
});
test('lost refresh response is not automatically replayed; existing UI session remains', async () => {
  let refreshes = 0;
  const auth = client(async (url) => {
    if (url.endsWith('/auth/login')) return json(token(), 201);
    refreshes++;
    throw new TypeError('connection lost');
  });
  await auth.login('operator', 'test');
  await assert.rejects(auth.restore({ force: true, failedToken: 'one' }));
  assert.ok(auth.user);
  await assert.rejects(auth.restore({ force: true, failedToken: 'one' }), /refresh sebelumnya/);
  assert.equal(refreshes, 1);
});
test('server 5xx on refresh is not replayed', async () => {
  let refreshes = 0;
  const auth = client(async (url) => {
    if (url.endsWith('/auth/login')) return json(token(), 201);
    refreshes++;
    return json({}, 503);
  });
  await auth.login('operator', 'test');
  await assert.rejects(auth.restore({ force: true, failedToken: 'one' }));
  await assert.rejects(auth.restore({ force: true, failedToken: 'one' }));
  assert.equal(refreshes, 1);
  assert.ok(auth.user);
});
test('failed logout keeps the session; confirmed logout clears it', async () => {
  let fails = true;
  const auth = client(async (url) =>
    url.endsWith('/auth/login')
      ? json(token(), 201)
      : fails
        ? json({}, 503)
        : new Response(null, { status: 204 }),
  );
  await auth.login('operator', 'test');
  await assert.rejects(auth.logout());
  assert.ok(auth.user);
  fails = false;
  await auth.logout();
  assert.equal(auth.user, null);
});
test('logout-all sends the current Bearer and CSRF headers', async () => {
  let request: ({ url: string } & RequestInit) | undefined;
  const auth = client(async (url, init) => {
    if (url.endsWith('/auth/login')) return json(token('access'), 201);
    request = { url, ...init };
    return new Response(null, { status: 204 });
  });
  await auth.login('operator', 'test');
  await auth.logout(true);
  assert.ok(request);
  assert.equal(request.url, base + '/auth/logout-all');
  assert.equal(new Headers(request.headers).get('Authorization'), 'Bearer access');
  assert.equal(new Headers(request.headers).get('X-CSRF-Protection'), '1');
  assert.equal(auth.user, null);
});
test('429 honors Retry-After before further auth calls', async () => {
  let calls = 0;
  const auth = client(async () => {
    calls++;
    return json({}, 429, { 'Retry-After': '60' });
  });
  await assert.rejects(
    auth.login('operator', 'test'),
    (e: unknown) => e instanceof ApiError && e.status === 429,
  );
  await assert.rejects(
    auth.login('operator', 'test'),
    (e: unknown) => e instanceof ApiError && e.status === 429,
  );
  assert.equal(calls, 1);
});
test('two tabs share one rotated token under the same Web Lock', async () => {
  const channels: ChannelProvider[] = [];
  const channel = () => {
    const item: ChannelProvider = {
      onmessage: null,
      postMessage(data: unknown) {
        for (const peer of channels)
          if (peer !== item)
            queueMicrotask(() => peer.onmessage?.(new MessageEvent('message', { data })));
      },
      close() {},
    };
    channels.push(item);
    return item;
  };
  const sharedLocks = locks(),
    persisted = storage();
  let refreshes = 0;
  const fetcher = async (url: string) => {
    assert.equal(url, base + '/auth/refresh');
    refreshes++;
    return json(token('rotated'));
  };
  const a = client(fetcher, { locks: sharedLocks, storage: persisted, channel: channel() });
  const b = client(fetcher, { locks: sharedLocks, storage: persisted, channel: channel() });
  await Promise.all([a.restore(), b.restore()]);
  assert.equal(refreshes, 1);
  assert.equal(a.user?.username, 'operator');
  assert.equal(b.user?.username, 'operator');
  a.close();
  b.close();
});
test('missing Web Locks fails safely before sending refresh', async () => {
  let calls = 0;
  const auth = client(
    async () => {
      calls++;
      return json(token());
    },
    { locks: null },
  );
  await assert.rejects(auth.restore(), /Web Locks/);
  assert.equal(calls, 0);
});

test('confirmed logout clears memory when coordination storage becomes unavailable', async () => {
  const persisted = storage();
  let available = true;
  const auth = client(
    async (url) =>
      url.endsWith('/auth/login') ? json(token(), 201) : new Response(null, { status: 204 }),
    {
      storage: {
        getItem: persisted.getItem,
        setItem(key, value) {
          if (!available) throw new Error('Storage blocked');
          persisted.setItem(key, value);
        },
      },
    },
  );
  await auth.login('operator', 'test');
  available = false;
  await auth.logout();
  assert.equal(auth.user, null);
});
