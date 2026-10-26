import type { ApiClient } from '../../core/api/client';
import { userSchema, type User } from '../../core/auth/schema';
import { record } from '../../shared/data/guards';

export async function loadProfile(
  api: ApiClient,
  sessionUser: User,
  signal: AbortSignal,
): Promise<User> {
  const payload = await api.request('/auth/me', { signal });
  const profile = userSchema.parse(record(payload).user ?? payload);
  if (profile.id !== sessionUser.id || profile.operatorId !== sessionUser.operatorId)
    throw new Error('Profil tidak sesuai dengan sesi aktif. Silakan masuk kembali.');
  return profile;
}
