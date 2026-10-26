import { LoadingPopup } from '../shared/ui/loading-popup';
import { ErrorBoundary } from './error-boundary';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Disposable } from '../core/types';
import type { User } from '../core/auth/schema';
import { useSession } from './use-session';
import { Shell } from './shell';
import type { PageId } from './routes';
import { ManagementPage } from '../features/management/management-page';
import { isModuleId } from '../features/management/definitions';
import { MonitoringPage } from '../features/monitoring/monitoring-page';
import { SettingsPage } from '../features/settings/settings-page';
import { DemoPage } from '../features/demo/demo-page';
import { LoginPage } from '../features/auth/login-page';
import { OverviewPage } from '../features/overview/overview-page';
import { ProfilePage } from '../features/profile/profile-page';
const MapPage = lazy(() =>
  import('../features/maps/map-page').then((module) => ({ default: module.MapPage })),
);
const LegacyApplication = lazy(() =>
  import('../features/legacy-tms/application').then((module) => ({
    default: module.LegacyApplication,
  })),
);
import { showConnectionDialog } from '../features/settings/connection-dialog';
import { closeDialog, openDialog } from '../shared/ui/dialog';
import { createToast } from '../shared/ui/toast';
import { query } from '../shared/ui/dom';
import { messageOf } from '../shared/data/guards';
const demoUser: User = {
  id: 'demo',
  username: 'Demo workspace',
  role: 'OPERATOR_VIEWER',
  operatorId: null,
};
function Application({ notify }: { notify: (message: string) => void }) {
  const session = useSession();
  const [demo, setDemo] = useState(false),
    [page, setPage] = useState<PageId>('overview'),
    [revision, setRevision] = useState(0);
  const configure = useCallback(
    () =>
      showConnectionDialog((value) => {
        session.saveConnection(value);
        setDemo(false);
      }),
    [session.saveConnection],
  );
  const logout = useCallback(
    (all = false) => {
      if (demo) {
        setDemo(false);
        return;
      }
      const perform = () => {
        void session.auth?.logout(all).catch((error: unknown) => notify(messageOf(error)));
      };
      if (all) {
        const dialog = openDialog(
          'Keluar dari semua perangkat?',
          '<p>Semua sesi akun CMS Anda akan dicabut, termasuk sesi browser ini.</p><button class="button danger full" id="confirm-logout">Ya, keluar dari semua perangkat</button>',
        );
        query('#confirm-logout', dialog.element).onclick = perform;
      } else perform();
    },
    [demo, session.auth, notify],
  );
  useEffect(() => () => closeDialog(), [page, session.user?.id, demo]);
  if (!session.auth || (!session.user && !demo))
    return (
      <LoginPage
        restoring={session.restoring}
        message={session.message}
        onConfigure={configure}
        onDemo={() => {
          setDemo(true);
          setPage('overview');
        }}
        onLogin={async (username, password) => {
          await session.auth?.login(username, password);
          setDemo(false);
          setPage('overview');
        }}
      />
    );
  const user = demo ? demoUser : session.user;
  if (!user) return null;
  return (
    <Shell
      page={page}
      user={user}
      demo={demo}
      onNavigate={setPage}
      onConnect={configure}
      onRefresh={() => setRevision((value) => value + 1)}
    >
      {page === 'overview' ? (
        <OverviewPage auth={session.auth} role={user.role} demo={demo} revision={revision} />
      ) : page === 'map' ? (
        <Suspense fallback={<div className="monitor-empty">Memuat peta…</div>}>
          <MapPage auth={session.auth} demo={demo} revision={revision} />
        </Suspense>
      ) : page === 'account' ? (
        <ProfilePage
          key={`${demo}:${user.id}`}
          auth={session.auth}
          user={user}
          demo={demo}
          revision={revision}
          onLogout={() => logout()}
        />
      ) : page === 'settings' ? (
        <SettingsPage
          auth={session.auth}
          demo={demo}
          revision={revision}
          notify={notify}
          saveConnection={session.saveConnection}
          logout={logout}
        />
      ) : isModuleId(page) ? (
        demo ? (
          <div className="notice">Masuk ke CMS untuk mengakses modul ini.</div>
        ) : (
          <ManagementPage
            key={page}
            id={page}
            auth={session.auth}
            revision={revision}
            notify={notify}
          />
        )
      ) : demo ? (
        <DemoPage key={page} view={page} notify={notify} />
      ) : (
        <MonitoringPage key={page} auth={session.auth} view={page} revision={revision} />
      )}
    </Shell>
  );
}
export function startApplication(element: HTMLElement, toastElement: HTMLElement): Disposable {
  const root = createRoot(element),
    toast = createToast(toastElement);
  root.render(
    <ErrorBoundary>
      {/^\/old\/?$/.test(location.pathname) ? (
        <Suspense fallback={<p role="status">Memuat workspace TMS…</p>}>
          <LegacyApplication />
        </Suspense>
      ) : (
        <Application notify={toast.notify} />
      )}
      <LoadingPopup />
    </ErrorBoundary>,
  );
  return {
    destroy() {
      root.unmount();
      toast.destroy();
    },
  };
}
