import './legacy.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { TmsClient } from './client';
import { resources, type LegacyPage, type ResourceId } from './contract';
import { ResourcePage } from './resource-page';
import { messageOf } from '../../shared/data/guards';

const LegacyMap = lazy(() =>
  import('./map-page').then((module) => ({ default: module.LegacyMapPage })),
);
const groups = ['Operasional', 'Administrasi'] as const;
function ConnectForm({ onConnect }: { onConnect: (client: TmsClient) => void }) {
  const [error, setError] = useState('');
  return (
    <main className="legacy-connect">
      <img src="/assets/amj-logo.svg" alt="TK. Ananda Makmur Jaya" />
      <span className="legacy-eyebrow">TMS · Workspace terpisah</span>
      <h1>Hubungkan sesi TMS</h1>
      <p>
        Gunakan access token dari sesi TMS Anda. Token hanya disimpan di memori tab ini dan dihapus
        saat halaman dimuat ulang.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget,
            data = new FormData(form);
          try {
            const client = new TmsClient(
              String(data.get('accessToken') ?? ''),
              String(data.get('refreshToken') ?? ''),
            );
            form.reset();
            onConnect(client);
          } catch (reason) {
            setError(messageOf(reason));
          }
        }}
      >
        <label>
          Access token TMS
          <input
            name="accessToken"
            type="password"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <label>
          Refresh token TMS (opsional)
          <input name="refreshToken" type="password" autoComplete="off" spellCheck={false} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="button primary" type="submit">
          Hubungkan TMS
        </button>
      </form>
      <details>
        <summary>Cara mengambil token</summary>
        <p>
          Di browser Anda yang sudah login TMS: DevTools → Application/Storage → Cookies → domain
          TMS. Salin nilai <code>accessToken</code> ke form ini. Jangan kirim token lewat chat. Jika
          cookie tidak bisa diakses, minta access token melalui pengelola API TMS.
        </p>
      </details>
      <p className="legacy-caption">
        Login username/password belum tersedia karena proses login tidak tercakup dalam HAR.
      </p>
      <a href="/">Kembali ke Tracks Monitor</a>
    </main>
  );
}
export function LegacyApplication() {
  const [client, setClient] = useState<TmsClient | null>(null);
  const [page, setPage] = useState<LegacyPage>('live');
  const [sidebar, setSidebar] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => () => client?.dispose(), [client]);
  if (!client)
    return (
      <div className="legacy-app">
        <ConnectForm
          onConnect={(next) => {
            setClient(next);
            setPage('live');
          }}
        />
      </div>
    );
  return (
    <div className={`legacy-app legacy-workspace ${sidebar ? '' : 'legacy-collapsed'}`}>
      <header className="legacy-header">
        <button
          className="button"
          aria-label={sidebar ? 'Tutup sidebar TMS' : 'Buka sidebar TMS'}
          aria-expanded={sidebar}
          onClick={() => setSidebar((open) => !open)}
        >
          ☰
        </button>
        <img src="/assets/amj-logo.svg" alt="AMJ" />
        <strong>
          TMS <span>Legacy workspace</span>
        </strong>
        <a className="button" href="/">
          Tracks Monitor ↗
        </a>
      </header>
      {sidebar ? (
        <nav className="legacy-sidebar" aria-label="Modul TMS">
          {groups.map((group) => (
            <details key={group} open>
              <summary>{group}</summary>
              {group === 'Operasional' ? (
                <button
                  aria-current={page === 'map' ? 'page' : undefined}
                  onClick={() => setPage('map')}
                >
                  Peta armada
                </button>
              ) : null}
              {(Object.entries(resources) as [ResourceId, (typeof resources)[ResourceId]][])
                .filter(([, resource]) => resource.group === group)
                .map(([id, resource]) => (
                  <button
                    key={id}
                    aria-current={page === id ? 'page' : undefined}
                    onClick={() => setPage(id)}
                  >
                    {resource.title}
                  </button>
                ))}
            </details>
          ))}
          <button
            className="button"
            onClick={() => {
              client.dispose();
              setClient(null);
            }}
          >
            Putuskan sesi TMS
          </button>
        </nav>
      ) : null}
      <main className="legacy-main">
        <div className="legacy-page-heading">
          <div>
            <span className="legacy-eyebrow">
              TMS / {page === 'map' ? 'Operasional' : resources[page].group}
            </span>
            <h1>{page === 'map' ? 'Peta armada' : resources[page].title}</h1>
          </div>
          <button className="button" onClick={() => setRevision((n) => n + 1)}>
            ↻ Muat ulang
          </button>
        </div>
        {page === 'map' ? (
          <Suspense fallback={<p role="status">Memuat peta…</p>}>
            <LegacyMap client={client} revision={revision} />
          </Suspense>
        ) : (
          <ResourcePage key={page} client={client} resource={page} revision={revision} />
        )}
      </main>
    </div>
  );
}
