import { html } from '../../shared/ui/html';
import { icon } from '../../shared/ui/icons';
import { escape as safe } from '../../shared/data/presentation';
import { readConfig, getCartoKey } from '../../core/config/runtime';
import type { User } from '../../core/auth/schema';
export function settingsView({ demo, user }: { demo: boolean; user: User | null }): string {
  const c = readConfig();
  return html`<div class="settings-grid">
    <section class="panel settings-panel">
      <div class="panel-heading">
        <div>
          <h2>Peta CARTO</h2>
          <p>Konfigurasi basemap workspace</p>
        </div>
        ${icon('pin')}
      </div>
      <form id="map-settings">
        <label class="field"
          >Basemap API key<input
            type="password"
            name="cartoKey"
            autocomplete="off"
            placeholder="${getCartoKey() ? 'Key sudah dikonfigurasi. Isi untuk mengganti.' : 'Masukkan CARTO Basemaps API key'}"
        /></label>
        <div class="filter-actions">
          <button class="button secondary" id="clear-carto-key" type="button">
            Gunakan key runtime</button
          ><button class="button primary" type="submit">Simpan key peta</button>
        </div>
      </form>
    </section>
    <section class="panel settings-panel">
      <div class="panel-heading">
        <div>
          <h2>Koneksi backend</h2>
          <p>Autentikasi CMS terpisah dari layanan telemetry.</p>
        </div>
        ${icon('settings')}
      </div>
      <form id="settings-form">
        <label class="field"
          >CMS API base URL<input
            name="cmsBase"
            type="url"
            placeholder="https://cms-api.example.com/api/v1"
            value="${safe(c.cmsBase || '')}"
            required
          /><small
            >Isi base URL yang melayani /auth/login, /auth/refresh, dan /auth/me.</small
          ></label
        ><label class="field"
          >Dokumentasi telemetry<input
            type="url"
            value="https://tracksmon-dev-api.aestaworks.com/docs"
            readonly
        /></label>
        <div class="notice">
          Origin FE harus terdaftar pada CORS_ORIGINS. Untuk FE lintas situs, konfigurasi refresh
          cookie memerlukan SameSite=None dan HTTPS di backend.
        </div>
        <button class="button primary" type="submit">Simpan koneksi ${icon('check')}</button>
      </form>
    </section>
    <section class="panel settings-panel">
      <div class="panel-heading">
        <div>
          <h2>Sesi & akses</h2>
          <p>Akses mengikuti akun CMS.</p>
        </div>
        ${icon('shield')}
      </div>
      <div class="session-details">
        <span>Mode<strong>${demo ? 'Demo workspace' : 'CMS terautentikasi'}</strong></span
        ><span>Role<strong>${demo ? 'OPERATOR_VIEWER (demo)' : safe(user?.role)}</strong></span>
        <p>
          Access token disimpan di memori. Refresh cookie dikelola browser dan tidak dibaca
          JavaScript.
        </p>
        <button class="button secondary" id="logout-current">
          ${icon('logout')} ${demo ? 'Keluar demo' : 'Keluar sesi ini'}</button
        >${!demo ? '<button class="button danger" id="logout-all">Keluar dari semua perangkat</button>' : ''}
      </div>
    </section>
  </div>`;
}
