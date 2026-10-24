import { useState } from 'react';
import { Icon } from '../../app/shell';
import { messageOf } from '../../shared/data/guards';
interface Props {
  restoring: boolean;
  message: string;
  onLogin: (username: string, password: string) => Promise<void>;
  onDemo: () => void;
  onConfigure: () => void;
}
export function LoginPage({ restoring, message, onLogin, onDemo, onConfigure }: Props) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [visible, setVisible] = useState(false);
  return (
    <main className="login">
      <section className="login-story">
        <a className="brand" href="#">
          <img src="/assets/amj-logo.svg" alt="AMJ" />
        </a>
        <div className="story-copy">
          <span className="eyebrow">FLEET OPERATIONS, CONNECTED</span>
          <h1>
            Setiap perjalanan.
            <br />
            Dalam kendalimu.
          </h1>
          <p>
            Satu workspace untuk memantau armada, mengikuti pergerakan, dan menjaga operasional
            tetap berjalan.
          </p>
          <div className="story-map">
            <img
              className="city-map"
              src="/assets/login-map.svg"
              alt="Ilustrasi area monitoring armada Jakarta"
            />
          </div>
        </div>
        <footer>
          AMJ FLEET <span>TK Ananda Makmur Jaya</span>
        </footer>
      </section>
      <section className="login-main">
        <div className="login-top">OPERATIONS WORKSPACE</div>
        <div className="login-form">
          <div className="small-logo">
            <Icon name="shield" />
          </div>
          <h2>Selamat datang kembali.</h2>
          <p>Masuk untuk mengakses workspace armada Anda.</p>
          {message ? (
            <div className="notice" role="status">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="notice error" role="alert">
              {error}
            </div>
          ) : null}
          <form
            id="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setBusy(true);
              setError('');
              void onLogin(
                String(data.get('username') ?? '').trim(),
                String(data.get('password') ?? ''),
              )
                .catch((reason: unknown) => setError(messageOf(reason)))
                .finally(() => setBusy(false));
            }}
          >
            <label className="field">
              Username
              <input
                name="username"
                autoComplete="username"
                required
                placeholder="Masukkan username"
              />
            </label>
            <div className="password-wrap">
              <label className="field">
                Password
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan password"
                />
              </label>
              <button
                type="button"
                id="toggle-password"
                className="eye-button"
                aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
                onClick={() => setVisible((value) => !value)}
              >
                <Icon name="eye" />
              </button>
            </div>
            <div className="login-note">
              <Icon name="shield" />
              Sesi aman dengan autentikasi CMS
            </div>
            <button className="button primary full" type="submit" disabled={busy || restoring}>
              {busy || restoring ? 'Menghubungkan…' : 'Masuk ke workspace'}
            </button>
          </form>
          <div className="divider">
            <span>atau jelajahi terlebih dahulu</span>
          </div>
          <button id="demo" className="button secondary full" onClick={onDemo}>
            Buka workspace demo <Icon name="arrow" />
          </button>
          <button id="configure" className="text-button" onClick={onConfigure}>
            <Icon name="settings" />
            Konfigurasi koneksi API
          </button>
          <p className="login-footnote">Akses mengikuti role dan operator akun Anda.</p>
        </div>
        <footer>© {new Date().getFullYear()} Ananda Makmur Jaya</footer>
      </section>
    </main>
  );
}
