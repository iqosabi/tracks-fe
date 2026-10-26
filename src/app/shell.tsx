import type { ReactNode } from 'react';
import type { User } from '../core/auth/schema';
import { isModuleId, moduleVisible } from '../features/management/definitions';
import { WorkspaceShell } from '../shared/ui/workspace-shell';
import { groups } from './navigation';
import { pageDescription, pageTitle, type PageId } from './routes';
export { Icon } from '../shared/ui/icon';
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
  const visibleGroups = groups.map((group) => ({
    ...group,
    entries: group.entries.filter(
      (entry) =>
        !isModuleId(entry.page) || moduleVisible(entry.page, demo ? 'SUPER_ADMIN' : user.role),
    ),
  }));
  return (
    <WorkspaceShell
      page={page}
      user={{ name: user.username, role: user.role }}
      demo={demo}
      onNavigate={onNavigate}
      onConnect={onConnect}
      onRefresh={onRefresh}
      groups={visibleGroups}
      title={pageTitle(page)}
      description={pageDescription(page)}
      profilePage="account"
      settingsPage="settings"
      notificationPage="alerts"
    >
      {children}
    </WorkspaceShell>
  );
}
