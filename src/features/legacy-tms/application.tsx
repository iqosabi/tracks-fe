import './legacy.css';
import '../profile/profile.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { WorkspaceShell, type WorkspaceGroup } from '../../shared/ui/workspace-shell';
import { Icon } from '../../shared/ui/icon';
import { TmsClient } from './client';
import { resources, type LegacyPage, type ResourceId, type TmsUser } from './contract';
import { ResourcePage } from './resource-page';
import { TmsLoginPage } from './login-page';
const LegacyMap = lazy(() =>
  import('./map-page').then((module) => ({ default: module.LegacyMapPage })),
);
const groups: WorkspaceGroup<LegacyPage>[] = [
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: 'grid',
    entries: [
      { page: 'live', label: 'Armada live', icon: 'bus' },
      { page: 'map', label: 'Peta armada', icon: 'pin' },
    ],
  },
  {
    id: 'operations',
    label: 'Data & operasional',
    icon: 'bus',
    entries: (['fleets', 'stations', 'corridors'] as const).map((page) => ({
      page,
      label: resources[page].title,
      icon: 'bus' as const,
    })),
  },
  {
    id: 'administration',
    label: 'Administrasi',
    icon: 'shield',
    entries: (['tenantSummary', 'tenants', 'myMenus', 'menus'] as ResourceId[]).map((page) => ({
      page,
      label: resources[page].title,
      icon: 'grid' as const,
    })),
  },
];
export function LegacyApplication() {
  const [session, setSession] = useState<{ client: TmsClient; user: TmsUser } | null>(null);
  const client = session?.client;
  const [page, setPage] = useState<LegacyPage>('live'),
    [revision, setRevision] = useState(0);
  useEffect(() => () => client?.dispose(), [client]);
  if (!client || !session)
    return (
      <TmsLoginPage
        onLogin={(next) => {
          setSession(next);
          setPage('live');
        }}
      />
    );
  const title =
    page === 'map' ? 'Peta armada' : page === 'account' ? 'Profil akun' : resources[page].title;
  const logout = () => {
    client.dispose();
    setSession(null);
  };
  return (
    <WorkspaceShell
      page={page}
      user={{ name: session.user.fullName, role: session.user.role }}
      onNavigate={setPage}
      onRefresh={() => setRevision((n) => n + 1)}
      groups={groups}
      title={title}
      description={
        page === 'map'
          ? 'Lihat posisi dan pergerakan armada Anda.'
          : 'Pantau dan kelola data operasional armada Anda.'
      }
      profilePage="account"
      navLabel="Modul TMS"
      footerLabel="Fleet Monitoring • data API TMS"
      extraNavigation={
        <a className="nav-item" href="/">
          <Icon name="arrow" />
          <span>Tracks Monitor</span>
        </a>
      }
    >
      {page === 'map' ? (
        <Suspense
          fallback={
            <p className="monitor-empty" role="status">
              Memuat peta…
            </p>
          }
        >
          <LegacyMap client={client} revision={revision} />
        </Suspense>
      ) : page === 'account' ? (
        <section className="panel account-profile" aria-label="Profil akun TMS">
          <div className="account-profile-header">
            <span className="avatar account-profile-avatar">
              {session.user.fullName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2>{session.user.fullName}</h2>
              <p>Terautentikasi · TMS</p>
            </div>
          </div>
          <dl className="account-profile-details">
            {[
              ['Email', session.user.email],
              ['Role', session.user.role.replaceAll('_', ' ')],
              ['Telepon', session.user.phoneNumber || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="account-profile-actions">
            <button className="button danger" onClick={logout}>
              <Icon name="logout" />
              Keluar dari TMS
            </button>
          </div>
        </section>
      ) : (
        <ResourcePage key={page} client={client} resource={page} revision={revision} />
      )}
    </WorkspaceShell>
  );
}
