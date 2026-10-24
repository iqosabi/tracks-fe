import { html } from '../../shared/ui/html';
import { icon, brand } from '../../shared/ui/icons';
import { escape as safe } from '../../shared/data/presentation';
function loginField(label: string, name: string, type: string, placeholder: string): string {
  return html`<label class="field"
    >${label}<input
      name="${name}"
      type="${type}"
      placeholder="${placeholder}"
      autocomplete="${name === 'password' ? 'current-password' : 'username'}"
      required
  /></label>`;
}
export function loginView({
  error = '',
  sessionError = '',
  loading = false,
}: {
  error?: string;
  sessionError?: string;
  loading?: boolean;
}): string {
  return html`<main class="login">
    <section class="login-story">
      <a class="brand" href="#">${brand()}</a>
      <div class="story-copy">
        <span class="eyebrow">FLEET OPERATIONS, CONNECTED</span>
        <h1>Setiap perjalanan.<br />Dalam kendalimu.</h1>
        <p>
          Satu workspace untuk memantau armada, mengikuti pergerakan, dan menjaga operasional tetap
          berjalan.
        </p>
        <div class="story-map">
          <img
            class="city-map"
            src="/assets/login-map.svg"
            alt="Ilustrasi area monitoring armada Jakarta"
          />
          <div class="story-map-label">${icon('pin')} Built for a city that never stops.</div>
        </div>
      </div>
      <footer>AMJ FLEET <span>TK Ananda Makmur Jaya</span></footer>
    </section>
    <section class="login-main">
      <div class="login-top">OPERATIONS WORKSPACE <span>● Sistem monitoring armada</span></div>
      <div class="login-form">
        <div class="small-logo">${icon('shield')}</div>
        <h2>Selamat datang kembali.</h2>
        <p>Masuk untuk mengakses workspace armada Anda.</p>
        ${error ? `<div class="notice error" role="alert">${safe(error)}</div>` : ''}${sessionError ? `<div class="notice" role="status">${safe(sessionError)}</div>` : ''}
        <form id="login-form">
          ${loginField('Username', 'username', 'text', 'Masukkan username')}
          <div class="password-wrap">
            ${loginField('Password', 'password', 'password', 'Masukkan password')}<button
              type="button"
              id="toggle-password"
              class="eye-button"
              aria-label="Tampilkan password"
            >
              ${icon('eye')}
            </button>
          </div>
          <div class="login-note">${icon('shield')} Sesi aman dengan autentikasi CMS</div>
          <button class="button primary full" type="submit" ${loading ? 'disabled' : ''}>
            ${loading ? 'Menghubungkan…' : 'Masuk ke workspace'} ${icon('arrow')}
          </button>
        </form>
        <div class="divider"><span>atau jelajahi terlebih dahulu</span></div>
        <button id="demo" class="button secondary full">Buka workspace demo ${icon('arrow')}</button
        ><button id="configure" class="text-button">
          ${icon('settings')} Konfigurasi koneksi API
        </button>
        <p class="login-footnote">
          Akses mengikuti role dan operator akun Anda.<br />Hubungi administrator untuk mendapatkan
          akun.
        </p>
      </div>
      <footer>
        © ${new Date().getFullYear()} Ananda Makmur Jaya
        <span>Operational clarity, every day.</span>
      </footer>
    </section>
  </main>`;
}
