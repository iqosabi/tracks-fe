import { modules } from '../features/management/definitions';
import { type IconName } from '../shared/ui/icons';
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
export const groups: NavigationGroup[] = [
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
