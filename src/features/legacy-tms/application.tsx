import './legacy.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { TmsClient } from './client';
import { resources, type LegacyPage, type ResourceId, type TmsUser } from './contract';
import { ResourcePage } from './resource-page';
import { TmsLoginPage } from './login-page';

const LegacyMap = lazy(() =>
  import('./map-page').then((module) => ({ default: module.LegacyMapPage })),
);
const groups = ['Operasional', 'Administrasi'] as const;
export function LegacyApplication() {
  const [session, setSession] = useState<{ client: TmsClient; user: TmsUser } | null>(null);
  const client = session?.client;
  const [page, setPage] = useState<LegacyPage>('live');
  const [sidebar, setSidebar] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => () => client?.dispose(), [client]);
  if (!client)
    return (
      <div className="legacy-app">
        <TmsLoginPage
          onLogin={(next) => {
            setSession(next);
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
          TMS{' '}
          <span>
            {session?.user.fullName} · {session?.user.role}
          </span>
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
              setSession(null);
            }}
          >
            Keluar dari TMS
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
