import { isModuleId, modules, type ModuleId } from '../features/management/definitions';

export type PageId = 'overview' | 'fleet' | 'map' | 'alerts' | 'settings' | ModuleId;
export function isPageId(value: string): value is PageId {
  return ['overview', 'fleet', 'map', 'alerts', 'settings'].includes(value) || isModuleId(value);
}
export function pageTitle(page: PageId): string {
  if (isModuleId(page)) return modules[page].title;
  return {
    overview: 'Ringkasan operasional',
    fleet: 'Armada live',
    map: 'Peta armada',
    alerts: 'Notifikasi',
    settings: 'Pengaturan',
  }[page];
}
export function pageDescription(page: PageId): string {
  if (isModuleId(page)) return modules[page].description;
  return {
    overview: 'Pantau armada dan aktivitas operasional dalam satu tampilan.',
    fleet: 'Temukan dan telusuri kondisi setiap kendaraan.',
    map: 'Lihat posisi dan pergerakan armada Anda.',
    alerts: 'Tetap terinformasi tentang aktivitas armada.',
    settings: 'Kelola koneksi API dan sesi workspace Anda.',
  }[page];
}
