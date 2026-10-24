import { html } from '../shared/ui/html';
import type { User } from '../core/auth/schema';
import { escape as safe } from '../shared/data/presentation';
import { icon, brand } from '../shared/ui/icons';
import { navigation } from './navigation';
import { pageTitle, pageDescription, type PageId } from './routes';
import type { SidebarPreferences } from './preferences';
interface ShellOptions {
  page: PageId;
  user: User;
  demo: boolean;
  mobile: boolean;
  preferences: SidebarPreferences;
  content: string;
}
export function shellView({
  page,
  user,
  demo,
  mobile,
  preferences,
  content,
}: ShellOptions): string {
  const title = pageTitle(page);
  const navigationExpanded = matchMedia('(max-width:700px)').matches
    ? mobile
    : !preferences.collapsed;
  return html`<div
    class="workspace ${mobile ? 'menu-open' : ''} ${preferences.collapsed ? 'sidebar-collapsed' : ''}"
  >
    <button class="sidebar-backdrop" aria-label="Tutup navigasi" id="sidebar-backdrop"></button>
    <aside class="sidebar">
      <div class="sidebar-brand-row">
        <a href="#" class="brand">${brand()}</a
        ><button type="button" id="sidebar-close" class="icon-button" aria-label="Tutup sidebar">
          ${icon('menu')}
        </button>
      </div>
      <nav id="workspace-navigation">
        ${navigation(page, demo ? 'SUPER_ADMIN' : user.role, preferences.groups)}
      </nav>
      <button class="nav-item ${page === 'settings' ? 'active' : ''}" data-page="settings">
        ${icon('settings')} Pengaturan
      </button>
      <div class="sidebar-bottom">
        <button class="user-profile" id="profile">
          <span class="avatar">${safe(user.username.slice(0, 2).toUpperCase())}</span
          ><span
            ><strong>${safe(user.username)}</strong
            ><small>${safe(user.role.replaceAll('_', ' ').toLowerCase())}</small></span
          >${icon('logout')}
        </button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button
          id="menu"
          class="icon-button sidebar-toggle"
          aria-label="${navigationExpanded ? 'Tutup navigasi' : 'Buka navigasi'}"
          aria-expanded="${navigationExpanded}"
          aria-controls="workspace-navigation"
        >
          ${icon('menu')}</button
        ><a class="header-brand" href="#" aria-label="AMJ"
          ><img src="/assets/amj-logo.svg" alt="AMJ"
        /></a>
        <div class="breadcrumb">Workspace ${icon('chevron')} <strong>${title}</strong></div>
        <div class="topbar-right">
          <span class="environment"><i></i>${demo ? 'Mode demo' : 'Sesi CMS aktif'}</span
          ><span class="top-divider"></span
          ><button class="icon-button" data-page="alerts" aria-label="Buka notifikasi">
            ${icon('bell')}${demo ? '<i class="notification-dot"></i>' : ''}</button
          ><span class="avatar small">${safe(user.username.slice(0, 2).toUpperCase())}</span>
        </div>
      </header>
      <main class="content">
        <div class="page-heading">
          <div>
            <div class="eyebrow">FLEET MONITORING</div>
            <h1>${title}<span class="heading-dot">.</span></h1>
            <p>${pageDescription(page)}</p>
          </div>
          <div class="heading-actions">
            <span class="date-chip"
              >${icon('clock')}
              ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())}</span
            ><button id="refresh" class="button secondary">${icon('refresh')} Perbarui</button>
          </div>
        </div>
        ${demo ? `<div class="demo-banner"><span><span class="demo-badge">DEMO</span> Anda sedang melihat data ilustrasi. Hubungkan CMS untuk mengakses akun Anda.</span><button id="connect">Hubungkan API ${icon('arrow')}</button></div>` : ''}${content}
      </main>
      <footer class="main-footer">
        <span
          ><i></i>
          ${demo ? 'Data ilustrasi • bukan telemetry live' : 'Fleet Monitoring • data API'}</span
        ><span>AMJ Fleet <span class="footer-version">/ Workspace v2.0</span></span>
      </footer>
    </div>
  </div>`;
}
