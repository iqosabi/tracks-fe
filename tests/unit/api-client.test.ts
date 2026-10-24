import { describe, expect, it } from 'vitest';
import { apiFor } from '../../src/core/api/client';
import { ApiError, retryDeadline } from '../../src/core/api/errors';
import type { AuthClient } from '../../src/core/auth/client';
import { tokenSchema } from '../../src/core/auth/schema';

function authWith(request: AuthClient['request']): AuthClient {
  return {
    user: null,
    request,
    async restore() {
      throw new Error('Not used');
    },
    async login() {
      throw new Error('Not used');
    },
    async logout() {},
    close() {},
  };
}

describe('API boundary', () => {
  it('keeps one rate-limit cooldown across feature consumers', async () => {
    let calls = 0;
    const auth = authWith(async () => {
      calls++;
      return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
    });
    const first = apiFor(auth),
      second = apiFor(auth);
    expect(first).toBe(second);
    await expect(first.request('/cms/buses')).rejects.toMatchObject({ status: 429 });
    await expect(second.request('/cms/devices')).rejects.toMatchObject({ status: 429 });
    expect(calls).toBe(1);
  });

  it('does not replay a write after an uncertain network failure', async () => {
    let calls = 0;
    const client = apiFor(
      authWith(async () => {
        calls++;
        throw new TypeError('offline');
      }),
    );
    await expect(client.request('/cms/buses', { method: 'POST', body: '{}' })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('reports malformed JSON without exposing the response body', async () => {
    const client = apiFor(authWith(async () => new Response('private-response', { status: 200 })));
    await expect(client.request('/cms/buses')).rejects.toThrow(
      'Respons API tidak berupa JSON yang valid.',
    );
  });

  it('supports empty successful mutations and encoded identifiers', async () => {
    let received = '';
    const client = apiFor(
      authWith(async (path) => {
        received = path;
        return new Response(null, { status: 204 });
      }),
    );
    expect(await client.request('/cms/routes/A%2FB', { method: 'DELETE' })).toBeNull();
    expect(received).toBe('/cms/routes/A%2FB');
  });

  it('accepts only valid authentication roles, session fields, and cookie deadlines', () => {
    expect(
      tokenSchema.safeParse({
        accessToken: 'x',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshExpiresAt: 'invalid',
        user: { id: '1', username: 'a', role: 'ADMIN', operatorId: null },
      }).success,
    ).toBe(false);
  });

  it('parses numeric and HTTP date Retry-After consistently', () => {
    expect(retryDeadline('10', 1_000)).toBe(11_000);
    expect(retryDeadline('Thu, 01 Jan 1970 00:01:00 GMT', 1_000)).toBe(60_000);
    expect(retryDeadline(null, 1_000)).toBe(31_000);
    expect(new ApiError('Forbidden', 403).status).toBe(403);
  });
});
