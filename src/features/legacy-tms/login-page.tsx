import { useEffect, useRef, useState } from 'react';
import { TmsClient } from './client';
import type { TmsUser } from './contract';
import { messageOf } from '../../shared/data/guards';

export function TmsLoginPage({
  onLogin,
}: {
  onLogin: (session: { client: TmsClient; user: TmsUser }) => void;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <main className="legacy-connect">
      <img src="/assets/amj-logo.svg" alt="TK. Ananda Makmur Jaya" />
      <span className="legacy-eyebrow">TMS · Fleet workspace</span>
      <h1>Masuk ke TMS</h1>
      <p>Masuk dengan akun TMS Anda untuk memantau armada dan mengakses data operasional.</p>
      <form
        aria-busy={busy}
        onSubmit={async (event) => {
          event.preventDefault();
          if (active.current) return;
          const form = event.currentTarget,
            data = new FormData(form),
            abort = new AbortController();
          active.current = abort;
          setBusy(true);
          setError('');
          try {
            const session = await TmsClient.login(
              {
                email: String(data.get('email') ?? '').trim(),
                password: String(data.get('password') ?? ''),
              },
              abort.signal,
            );
            if (abort.signal.aborted) {
              session.client.dispose();
              return;
            }
            form.reset();
            onLogin(session);
          } catch (reason) {
            if (!abort.signal.aborted) setError(messageOf(reason));
          } finally {
            if (!abort.signal.aborted) {
              active.current = null;
              setBusy(false);
            }
          }
        }}
      >
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nama@perusahaan.com"
            required
            disabled={busy}
          />
        </label>
        <label>
          Password
          <div className="legacy-password">
            <input
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={busy}
            />
            <button
              className="button"
              type="button"
              aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? 'Sembunyikan' : 'Lihat'}
            </button>
          </div>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? 'Sedang masuk…' : 'Masuk ke TMS'}
        </button>
      </form>
      <a href="/">Kembali ke Tracks Monitor</a>
    </main>
  );
}
