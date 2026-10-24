import { createAuth, type AuthClient } from '../core/auth/client';
import type { User } from '../core/auth/schema';
import { readConfig, saveApiBase } from '../core/config/runtime';
import type { Disposable, FeatureController } from '../core/types';
import { isModuleId, modules } from '../features/management/definitions';
import { mountManagement } from '../features/management/controller';
import { mountMonitoring } from '../features/monitoring/controller';
import { mountSettings } from '../features/settings/controller';
import { showConnectionDialog } from '../features/settings/connection-dialog';
import { mountLogin } from '../features/auth/login-controller';
import { mountDemo } from '../features/demo/controller';
import { demoView } from '../features/demo/view';
import { createToast } from '../shared/ui/toast';
import { openDialog, closeDialog } from '../shared/ui/dialog';
import { query } from '../shared/ui/dom';
import { escape } from '../shared/data/presentation';
import { messageOf } from '../shared/data/guards';
import { isPageId, type PageId } from './routes';
import { sidebarPreferences, persistSidebar } from './preferences';
import { shellView } from './shell';

const demoUser: User = {
  id: 'demo',
  username: 'Demo workspace',
  role: 'OPERATOR_VIEWER',
  operatorId: null,
};

export function startApplication(root: HTMLElement, toastElement: HTMLElement): Disposable {
  const toast = createToast(toastElement);
  const preferences = sidebarPreferences();
  const lifetime = new AbortController();
  let demo = false;
  let mobile = false;
  let page: PageId = 'overview';
  let view: Disposable | null = null;
  let feature: FeatureController | null = null;
  let viewEvents = new AbortController();
  let disposed = false;
  let auth: AuthClient;

  function resetView(): void {
    viewEvents.abort();
    viewEvents = new AbortController();
    closeDialog();
    view?.destroy();
    view = null;
    feature?.destroy();
    feature = null;
  }

  function makeAuth(): AuthClient {
    return createAuth({
      base: readConfig().cmsBase,
      onChange(session) {
        if (!session && !demo && !disposed) renderLogin();
      },
    });
  }

  function saveConnection(value: string): void {
    if (auth.user) throw new Error('Keluar dari sesi CMS sebelum mengganti koneksi.');
    saveApiBase(value);
    auth.close();
    auth = makeAuth();
    demo = false;
    renderLogin('Koneksi disimpan. Silakan masuk menggunakan akun CMS.');
  }

  function renderLogin(message = '', restoring = false): void {
    resetView();
    mobile = false;
    view = mountLogin({
      root,
      message,
      restoring,
      async onLogin(username, password) {
        await auth.login(username, password);
        if (disposed) return;
        demo = false;
        page = 'overview';
        renderWorkspace();
      },
      onDemo() {
        demo = true;
        page = 'overview';
        renderWorkspace();
      },
      onConfigure() {
        showConnectionDialog(saveConnection);
      },
    });
  }

  function toggleSidebar(open?: boolean): void {
    const workspace = query('.workspace', root);
    if (matchMedia('(max-width:700px)').matches) {
      mobile = open ?? !mobile;
      workspace.classList.toggle('menu-open', mobile);
    } else {
      preferences.collapsed = open === undefined ? !preferences.collapsed : !open;
      workspace.classList.toggle('sidebar-collapsed', preferences.collapsed);
      persistSidebar(preferences);
    }
    syncSidebarButton();
    window.dispatchEvent(new Event('resize'));
  }

  function syncSidebarButton(): void {
    const button = root.querySelector<HTMLElement>('#menu');
    if (!button) return;
    const expanded = matchMedia('(max-width:700px)').matches ? mobile : !preferences.collapsed;
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', expanded ? 'Tutup navigasi' : 'Buka navigasi');
  }

  function content(): string {
    if (page === 'settings') return '<div id="settings-workspace"></div>';
    if (isModuleId(page))
      return demo
        ? `
      <section class="panel demo-module"><h2>${escape(modules[page].title)}</h2>
        <p>${escape(modules[page].description)}</p>
        <div class="notice">Masuk ke CMS untuk menampilkan data dan menggunakan modul ini. Mode demo tidak mengirim perubahan ke server.</div>
        <button id="connect" class="button primary">Masuk ke CMS</button>
      </section>`
        : '<div id="module-workspace"></div>';
    return demo ? demoView(page) : '<div id="live-monitoring"></div>';
  }

  async function logout(all = false): Promise<void> {
    if (demo) {
      demo = false;
      renderLogin();
      return;
    }
    try {
      await auth.logout(all);
      if (!disposed) renderLogin(`Anda berhasil keluar${all ? ' dari semua perangkat' : ''}.`);
    } catch (error) {
      toast.notify('Logout server belum dapat dikonfirmasi. ' + messageOf(error));
    }
  }

  function confirmLogout(): void {
    const dialog = openDialog(
      'Keluar dari semua perangkat?',
      '<p>Semua sesi akun CMS Anda akan dicabut, termasuk sesi browser ini.</p><button class="button danger full" id="confirm-logout">Ya, keluar dari semua perangkat</button>',
    );
    query('#confirm-logout', dialog.element).onclick = () => {
      void logout(true);
    };
  }

  function renderWorkspace(): void {
    if (disposed) return;
    if (!demo && !auth.user) {
      renderLogin();
      return;
    }
    resetView();
    const user = demo ? demoUser : auth.user;
    if (!user) return;
    root.innerHTML = shellView({ page, user, demo, mobile, preferences, content: content() });
    const signal = viewEvents.signal;
    root.addEventListener(
      'click',
      (event) => {
        const target =
          event.target instanceof Element ? event.target.closest<HTMLElement>('button,a') : null;
        if (!target) return;
        const destination = target.dataset.page;
        if (destination && isPageId(destination)) {
          page = destination;
          mobile = false;
          renderWorkspace();
          return;
        }
        if (target.id === 'menu') toggleSidebar();
        if (target.id === 'sidebar-close' || target.id === 'sidebar-backdrop') toggleSidebar(false);
        if (target.id === 'profile') void logout();
        if (target.id === 'connect') showConnectionDialog(saveConnection);
        if (target.id === 'refresh' && feature) {
          const button = query<HTMLButtonElement>('#refresh', root);
          button.disabled = true;
          void feature
            .refresh()
            .catch((error: unknown) => toast.notify(messageOf(error)))
            .finally(() => {
              if (button.isConnected) button.disabled = false;
            });
        }
      },
      { signal },
    );
    root.querySelectorAll<HTMLDetailsElement>('[data-nav-group]').forEach((group) =>
      group.addEventListener(
        'toggle',
        () => {
          const id = group.dataset.navGroup;
          if (id) {
            preferences.groups[id] = group.open;
            persistSidebar(preferences);
          }
        },
        { signal },
      ),
    );
    if (page === 'settings') {
      feature = mountSettings({
        element: query('#settings-workspace', root),
        auth,
        demo,
        notify: toast.notify,
        onSaveBase: saveConnection,
        onLogout: (all) => (all ? confirmLogout() : void logout()),
      });
    } else if (!demo && isModuleId(page)) {
      feature = mountManagement({
        element: query('#module-workspace', root),
        auth,
        id: page,
        base: readConfig().cmsBase,
        notify: toast.notify,
      });
    } else if (!demo) {
      feature = mountMonitoring({
        element: query('#live-monitoring', root),
        auth,
        view: page,
        notify: toast.notify,
      });
    } else {
      feature = mountDemo(root, page, toast.notify);
    }
  }

  auth = makeAuth();
  window.addEventListener('resize', syncSidebarButton, { signal: lifetime.signal });
  renderLogin('Memulihkan sesi CMS…', true);
  void auth
    .restore()
    .then(() => {
      if (!disposed && !demo) renderWorkspace();
    })
    .catch((error: unknown) => {
      if (disposed || demo) return;
      renderLogin(
        error instanceof Error && 'status' in error && error.status === 401 ? '' : messageOf(error),
      );
    });
  return {
    destroy() {
      disposed = true;
      lifetime.abort();
      resetView();
      auth.close();
      toast.destroy();
    },
  };
}
