import type { Role } from '../core/auth/schema';
import { modules, moduleVisible } from '../features/management/definitions';
import { icon, type IconName } from '../shared/ui/icons';
import type { PageId } from './routes';

interface NavigationEntry {
  page: PageId;
  icon: IconName;
  label: string;
}
interface NavigationGroup {
  id: string;
  label: string;
  icon: IconName;
  entries: NavigationEntry[];
}
const fromModules = (ids: (keyof typeof modules)[]): NavigationEntry[] =>
  ids.map((page) => ({ page, icon: modules[page].icon, label: modules[page].title }));
const groups: NavigationGroup[] = [
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: 'grid',
    entries: [
      { page: 'overview', icon: 'grid', label: 'Ringkasan' },
      { page: 'fleet', icon: 'bus', label: 'Armada live' },
      { page: 'map', icon: 'pin', label: 'Peta armada' },
      { page: 'alerts', icon: 'bell', label: 'Notifikasi' },
      ...fromModules(['history', 'usage', 'operatorSummary']),
    ],
  },
  {
    id: 'operations',
    label: 'Data & operasional',
    icon: 'bus',
    entries: fromModules(['operators', 'buses', 'routes', 'devices', 'tickets']),
  },
  {
    id: 'administration',
    label: 'Administrasi',
    icon: 'shield',
    entries: fromModules(['users', 'audit', 'health', 'account']),
  },
];

export function navigation(page: PageId, role: Role, savedGroups: Record<string, boolean>): string {
  return groups
    .map((group) => {
      const entries = group.entries.filter(
        (entry) => !(entry.page in modules) || moduleVisible(entry.page, role),
      );
      if (entries.length === 0) return '';
      const active = entries.some((entry) => entry.page === page);
      const open = savedGroups[group.id] ?? (group.id === 'monitoring' || active);
      return `<details class="nav-group" data-nav-group="${group.id}" ${open ? 'open' : ''}>
      <summary class="nav-parent ${active ? 'has-active' : ''}">
        ${icon(group.icon)}<span>${group.label}</span>${icon('chevron', 'group-chevron')}
      </summary>
      <div class="nav-children">${entries
        .map(
          (entry) => `
        <button class="nav-item ${page === entry.page ? 'active' : ''}" data-page="${entry.page}" ${page === entry.page ? 'aria-current="page"' : ''}>
          ${icon(entry.icon)}<span>${entry.label}</span>
        </button>`,
        )
        .join('')}
      </div>
    </details>`;
    })
    .join('');
}
