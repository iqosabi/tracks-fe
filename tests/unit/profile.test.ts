import { expect, test } from 'vitest';
import type { ApiClient } from '../../src/core/api/client';
import type { User } from '../../src/core/auth/schema';
import { loadProfile } from '../../src/features/profile/api';

const user: User = {
  id: 'current-user',
  username: 'viewer',
  role: 'OPERATOR_VIEWER',
  operatorId: 'operator-1',
};

test('all roles read their own profile only through the authenticated self endpoint', async () => {
  for (const role of ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'OPERATOR_VIEWER'] as const) {
    const current = { ...user, role };
    const controller = new AbortController();
    const api: ApiClient = {
      async request(path, init) {
        expect(path).toBe('/auth/me');
        expect(init?.signal).toBe(controller.signal);
        return { user: { ...current, accessToken: 'must-not-render' } };
      },
    };
    expect(await loadProfile(api, current, controller.signal)).toEqual(current);
  }
});

test('profiles from another user or operator are rejected before rendering', async () => {
  for (const other of [
    { ...user, id: 'other-user' },
    { ...user, operatorId: 'other-operator' },
  ]) {
    const api: ApiClient = { request: async () => ({ user: other }) };
    await expect(loadProfile(api, user, new AbortController().signal)).rejects.toThrow(
      'Profil tidak sesuai dengan sesi aktif',
    );
  }
});

test('invalid profile data and request failures are surfaced to the page', async () => {
  const invalid: ApiClient = { request: async () => ({ user: { username: 'invalid' } }) };
  await expect(loadProfile(invalid, user, new AbortController().signal)).rejects.toThrow();
  const denied: ApiClient = {
    request: async () => {
      throw new Error('Akses ditolak');
    },
  };
  await expect(loadProfile(denied, user, new AbortController().signal)).rejects.toThrow(
    'Akses ditolak',
  );
});
