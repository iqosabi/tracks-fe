import { z } from 'zod';
import { readPreference, writePreference } from '../core/config/storage';

export interface SidebarPreferences {
  collapsed: boolean;
  groups: Record<string, boolean>;
}
export function sidebarPreferences(): SidebarPreferences {
  let groups: Record<string, boolean> = {};
  try {
    const value: unknown = JSON.parse(readPreference('tracks-nav-groups') ?? '{}');
    groups = z.record(z.string(), z.boolean()).parse(value);
  } catch {
    /* Invalid preferences do not prevent loading the workspace. */
  }
  return { collapsed: readPreference('tracks-sidebar-collapsed') === 'true', groups };
}
export function persistSidebar(preferences: SidebarPreferences): void {
  writePreference('tracks-sidebar-collapsed', String(preferences.collapsed));
  writePreference('tracks-nav-groups', JSON.stringify(preferences.groups));
}
