import type { FleetPosition } from './fleet-map';
import { escape } from '../../shared/ui/html';
export type MapTheme = 'dark' | 'light';
export function markerSize(zoom: number): number {
  const level = Number.isFinite(zoom) ? zoom : 12;
  return Math.round(Math.max(14, Math.min(32, 14 + (level - 9) * 1.6)));
}
export function markerTone(position: FleetPosition): string {
  if (position.overspeed) return 'overspeed';
  const status = (position.status ?? '').toUpperCase();
  return status === 'OFFLINE'
    ? 'offline'
    : ['IDLE', 'DELAY', 'DELAYED'].includes(status)
      ? 'delay'
      : 'normal';
}
export function markerHtml(position: FleetPosition): string {
  return `<span class="map-point ${markerTone(position)} ${position.selected ? 'selected' : ''}"><span class="bus-marker-symbol"><svg class="bus-marker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M12 3v8M8 19v2m8-2v2M8 15h1m6 0h1"/></svg></span><span class="bus-marker-label">${escape(position.label)}<i class="map-status-dot" aria-hidden="true"></i></span></span>`;
}
