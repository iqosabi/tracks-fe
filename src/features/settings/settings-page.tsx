import { useEffect, useRef, useState } from 'react';
import type { AuthClient } from '../../core/auth/client';
import type { Notify } from '../../core/types';
import { apiFor } from '../../core/api/client';
import { readConfig, getCartoKey, saveCartoKey, clearCartoKey } from '../../core/config/runtime';
import { messageOf } from '../../shared/data/guards';
interface Props {
  auth: AuthClient;
  demo: boolean;
  revision: number;
  notify: Notify;
  saveConnection: (base: string) => void;
  logout: (all: boolean) => void;
}
export function SettingsPage({ auth, demo, revision, notify, saveConnection, logout }: Props) {
  const [configured, setConfigured] = useState(() => !!getCartoKey());
  const previous = useRef(revision);
  useEffect(() => {
    if (previous.current === revision) return;
    previous.current = revision;
    const abort = new AbortController();
    if (!demo)
      void apiFor(auth)
        .request('/auth/me', { signal: abort.signal })
        .then(() => notify('Profil CMS terverifikasi.'))
        .catch((reason: unknown) => {
          if (!abort.signal.aborted) notify(messageOf(reason));
        });
    return () => abort.abort();
  }, [auth, demo, revision, notify]);
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Peta CARTO</h2>
            <p>Konfigurasi basemap workspace</p>
          </div>
        </div>
        <form
          id="map-settings"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              saveCartoKey(String(new FormData(event.currentTarget).get('cartoKey') ?? ''));
              event.currentTarget.reset();
              setConfigured(true);
              notify('Key peta tersimpan di browser ini.');
            } catch (reason) {
              notify(messageOf(reason));
            }
          }}
        >
          <label className="field">
            Basemap API key
            <input
              type="password"
              name="cartoKey"
              autoComplete="off"
              placeholder={
                configured
                  ? 'Key sudah dikonfigurasi. Isi untuk mengganti.'
                  : 'Masukkan CARTO Basemaps API key'
              }
            />
          </label>
          <div className="filter-actions">
            <button
              className="button secondary"
              id="clear-carto-key"
              type="button"
              onClick={() => {
                clearCartoKey();
                setConfigured(!!getCartoKey());
                notify('Peta menggunakan konfigurasi runtime.');
              }}
            >
              Gunakan key runtime
            </button>
            <button className="button primary" type="submit">
              Simpan key peta
            </button>
          </div>
        </form>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Koneksi backend</h2>
            <p>Konfigurasi layanan CMS dan telemetry.</p>
          </div>
        </div>
        <form
          id="settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              saveConnection(String(new FormData(event.currentTarget).get('cmsBase') ?? ''));
            } catch (reason) {
              notify(messageOf(reason));
            }
          }}
        >
          <label className="field">
            CMS API base URL
            <input name="cmsBase" type="url" defaultValue={readConfig().cmsBase} required />
            <small>Base URL yang melayani /auth/login, /auth/refresh, dan /auth/me.</small>
          </label>
          <label className="field">
            Dokumentasi telemetry
            <input type="url" value="https://tracksmon-dev-api.aestaworks.com/docs" readOnly />
          </label>
          <div className="notice">
            Origin FE harus terdaftar pada CORS_ORIGINS. Cookie lintas situs memerlukan
            SameSite=None dan HTTPS di backend.
          </div>
          <button className="button primary" type="submit">
            Simpan koneksi
          </button>
        </form>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Sesi & akses</h2>
            <p>Akses mengikuti akun CMS.</p>
          </div>
        </div>
        <div className="session-details">
          <span>
            Mode<strong>{demo ? 'Demo workspace' : 'CMS terautentikasi'}</strong>
          </span>
          <span>
            Role<strong>{demo ? 'OPERATOR_VIEWER (demo)' : auth.user?.role}</strong>
          </span>
          <p>Access token disimpan di memori. Refresh cookie dikelola browser.</p>
          <button className="button secondary" id="logout-current" onClick={() => logout(false)}>
            {demo ? 'Keluar demo' : 'Keluar sesi ini'}
          </button>
          {!demo ? (
            <button className="button danger" id="logout-all" onClick={() => logout(true)}>
              Keluar dari semua perangkat
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
