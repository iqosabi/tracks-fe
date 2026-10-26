import { useCallback } from 'react';
import type { AuthClient } from '../../core/auth/client';
import type { User } from '../../core/auth/schema';
import { apiFor } from '../../core/api/client';
import { statusText } from '../../shared/data/formatters';
import { useRequest } from '../../shared/hooks/use-request';
import { loadProfile } from './api';
import './profile.css';

interface Props {
  auth: AuthClient;
  user: User;
  demo: boolean;
  revision: number;
  onLogout: () => void;
}

export function ProfilePage({ auth, user, demo, revision, onLogout }: Props) {
  const load = useCallback(
    (signal: AbortSignal) => loadProfile(apiFor(auth), user, signal),
    [auth, user],
  );
  const state = useRequest(load, !demo, revision);
  const profile = demo ? user : state.data;
  return (
    <section className="panel account-profile" aria-label="Profil akun" aria-busy={state.busy}>
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      {profile ? (
        <>
          <header className="account-profile-header">
            <span className="avatar account-profile-avatar" aria-hidden="true">
              {profile.username.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2>{profile.username}</h2>
              <p>{statusText(profile.role)}</p>
            </div>
          </header>
          <dl className="account-profile-details">
            <div>
              <dt>Username</dt>
              <dd>{profile.username}</dd>
            </div>
            <div>
              <dt>Peran</dt>
              <dd>{statusText(profile.role)}</dd>
            </div>
            <div>
              <dt>Status sesi</dt>
              <dd>{demo ? 'Mode demo' : 'Terautentikasi'}</dd>
            </div>
            <div>
              <dt>Operator akun</dt>
              <dd>{profile.operatorId ?? 'Tidak ditetapkan'}</dd>
            </div>
          </dl>
        </>
      ) : state.busy ? (
        <p role="status">Memuat profil…</p>
      ) : null}
      <footer className="account-profile-actions">
        <button type="button" className="button secondary" id="profile-logout" onClick={onLogout}>
          {demo ? 'Keluar demo' : 'Keluar akun'}
        </button>
      </footer>
    </section>
  );
}
