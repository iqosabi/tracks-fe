import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { User } from '../core/auth/schema';
import { isModuleId, moduleVisible } from '../features/management/definitions';
import { icon, type IconName } from '../shared/ui/icons';
import { groups } from './navigation';
import { persistSidebar, sidebarPreferences } from './preferences';
import { pageDescription, pageTitle, type PageId } from './routes';
export function Icon({ name }: { name: IconName }) {
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />;
}
interface Props {
  page: PageId;
  user: User;
  demo: boolean;
  onNavigate: (page: PageId) => void;
  onConnect: () => void;
  onRefresh: () => void;
  children: ReactNode;
}
export function Shell({ page, user, demo, onNavigate, onConnect, onRefresh, children }: Props) {
  const [preferences, setPreferences] = useState(sidebarPreferences);
  const [mobile, setMobile] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width:700px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width:700px)');
    const changed = () => setNarrow(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    persistSidebar(preferences);
    window.dispatchEvent(new Event('resize'));
  }, [preferences]);
  const toggle = (open?: boolean) => {
    if (narrow) setMobile((value) => open ?? !value);
    else
      setPreferences((value) => ({
        ...value,
        collapsed: open === undefined ? !value.collapsed : !open,
      }));
  };
  const navigate = (destination: PageId) => {
    setMobile(false);
    onNavigate(destination);
  };
  return (
    <div
      className={`workspace ${mobile ? 'menu-open' : ''} ${preferences.collapsed ? 'sidebar-collapsed' : ''} ${page === 'map' ? 'page-map' : ''}`}
    >
      <button
        className="sidebar-backdrop"
        aria-label="Tutup navigasi"
        id="sidebar-backdrop"
        onClick={() => toggle(false)}
      />
      <aside className="sidebar">
        <div className="sidebar-brand-row">
          <a href="#" className="brand" aria-label="AMJ Fleets">
            <img src="/assets/amj-logo.svg" alt="AMJ" />
            <span className="sidebar-brand-label">
              <span>AMJ Fleets</span>
              <small>Ananda Jaya Makmur</small>
            </span>
          </a>
        </div>
        <nav id="workspace-navigation">
          {groups.map((group) => {
            const entries = group.entries.filter(
              (entry) =>
                !isModuleId(entry.page) ||
                moduleVisible(entry.page, demo ? 'SUPER_ADMIN' : user.role),
            );
            if (!entries.length) return null;
            const active = entries.some((entry) => entry.page === page);
            const open = preferences.groups[group.id] ?? (group.id === 'monitoring' || active);
            return (
              <details
                key={group.id}
                className="nav-group"
                data-nav-group={group.id}
                open={open}
                onToggle={(event) => {
                  const value = event.currentTarget.open;
                  setPreferences((previous) =>
                    previous.groups[group.id] === value
                      ? previous
                      : { ...previous, groups: { ...previous.groups, [group.id]: value } },
                  );
                }}
              >
                <summary className={`nav-parent ${active ? 'has-active' : ''}`}>
                  <Icon name={group.icon} />
                  <span>{group.label}</span>
                  <span className="group-chevron" aria-hidden="true">
                    <Icon name="chevron" />
                  </span>
                </summary>
                <div className="nav-children">
                  {entries.map((entry) => (
                    <button
                      key={entry.page}
                      data-page={entry.page}
                      className={`nav-item ${page === entry.page ? 'active' : ''}`}
                      aria-current={page === entry.page ? 'page' : undefined}
                      onClick={() => navigate(entry.page)}
                    >
                      <Icon name={entry.icon} />
                      <span>{entry.label}</span>
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
        <button
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          data-page="settings"
          onClick={() => navigate('settings')}
        >
          <Icon name="settings" />
          Pengaturan
        </button>
        <div className="sidebar-bottom">
          <button
            className="user-profile"
            id="profile"
            aria-label="Buka profil akun"
            aria-current={page === 'account' ? 'page' : undefined}
            onClick={() => navigate('account')}
          >
            <span className="avatar">{user.username.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{user.username}</strong>
              <small>{user.role.replaceAll('_', ' ').toLowerCase()}</small>
            </span>
            <Icon name="chevron" />
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            id="menu"
            className="icon-button sidebar-toggle"
            aria-label={
              (narrow ? mobile : !preferences.collapsed) ? 'Tutup navigasi' : 'Buka navigasi'
            }
            aria-expanded={narrow ? mobile : !preferences.collapsed}
            aria-controls="workspace-navigation"
            onClick={() => toggle()}
          >
            <Icon name="menu" />
          </button>
          <a className="header-brand" href="#" aria-label="AMJ">
            <img src="/assets/amj-logo.svg" alt="AMJ" />
          </a>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" />
            <strong>{pageTitle(page)}</strong>
          </div>
          <div className="topbar-right">
            {/* <span className="environment">
              <i />
              {demo ? 'Mode demo' : 'Sesi CMS aktif'}
            </span> */}
            <button
              className="icon-button"
              aria-label="Buka notifikasi"
              onClick={() => navigate('alerts')}
            >
              <Icon name="bell" />
            </button>
            <span className="avatar small">{user.username.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">FLEET MONITORING</div>
              <h1>
                {pageTitle(page)}
                <span className="heading-dot">.</span>
              </h1>
              <p>{pageDescription(page)}</p>
            </div>
            <button id="refresh" className="button secondary" onClick={onRefresh}>
              <Icon name="refresh" />
              Perbarui
            </button>
          </div>
          {demo && page !== 'map' ? (
            <div className="demo-banner">
              <span>
                <span className="demo-badge">DEMO</span> Anda sedang melihat data ilustrasi.
              </span>
              <button id="connect" onClick={onConnect}>
                Hubungkan API <Icon name="arrow" />
              </button>
            </div>
          ) : null}
          {children}
        </main>
        <footer className="main-footer">
          <span>
            {demo ? 'Data ilustrasi • bukan telemetry live' : 'Fleet Monitoring • data API'}
          </span>
          <span>AMJ Fleet / Workspace</span>
        </footer>
      </div>
    </div>
  );
}
