import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { persistSidebar, sidebarPreferences } from '../../app/preferences';
import { Icon } from './icon';
import type { IconName } from './icons';
export interface WorkspaceGroup<Page extends string> {
  id: string;
  label: string;
  icon: IconName;
  entries: { page: Page; label: string; icon: IconName }[];
}
interface Props<Page extends string> {
  page: Page;
  user: { name: string; role: string };
  demo?: boolean;
  onNavigate: (page: Page) => void;
  onConnect?: () => void;
  onRefresh: () => void;
  children: ReactNode;
  groups: WorkspaceGroup<Page>[];
  title: string;
  description: string;
  profilePage: Page;
  settingsPage?: Page;
  notificationPage?: Page;
  navLabel?: string;
  footerLabel?: string;
  extraNavigation?: ReactNode;
}
export function WorkspaceShell<Page extends string>({
  page,
  user,
  demo = false,
  onNavigate,
  onConnect,
  onRefresh,
  children,
  groups,
  title,
  description,
  profilePage,
  settingsPage,
  notificationPage,
  navLabel,
  footerLabel = 'Fleet Monitoring • data API',
  extraNavigation,
}: Props<Page>) {
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
  const navigate = (destination: Page) => {
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
        <nav id="workspace-navigation" aria-label={navLabel}>
          {groups.map((group) => {
            const entries = group.entries;
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
        {settingsPage ? (
          <button
            className={`nav-item ${page === settingsPage ? 'active' : ''}`}
            data-page={settingsPage}
            onClick={() => navigate(settingsPage)}
          >
            <Icon name="settings" />
            Pengaturan
          </button>
        ) : null}
        {extraNavigation}
        <div className="sidebar-bottom">
          <button
            className="user-profile"
            id="profile"
            aria-label="Buka profil akun"
            aria-current={page === profilePage ? 'page' : undefined}
            onClick={() => navigate(profilePage)}
          >
            <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{user.name}</strong>
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
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            {/* <span className="environment">
              <i />
              {demo ? 'Mode demo' : 'Sesi CMS aktif'}
            </span> */}
            {notificationPage ? (
              <button
                className="icon-button"
                aria-label="Buka notifikasi"
                onClick={() => navigate(notificationPage)}
              >
                <Icon name="bell" />
              </button>
            ) : null}
            <span className="avatar small">{user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">FLEET MONITORING</div>
              <h1>
                {title}
                <span className="heading-dot">.</span>
              </h1>
              <p>{description}</p>
            </div>
            <button id="refresh" className="button secondary" onClick={onRefresh}>
              <Icon name="refresh" />
              Perbarui
            </button>
          </div>
          {demo && onConnect && page !== 'map' ? (
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
          <span>{demo ? 'Data ilustrasi • bukan telemetry live' : footerLabel}</span>
          <span>AMJ Fleet / Workspace</span>
        </footer>
      </div>
    </div>
  );
}
