import { pick } from '../data/records';
import { number } from '../data/formatters';
import { html } from './html';
export function summaryCards(payload: unknown) {
  const defs: [string, string[]][] = [
    ['Total armada', ['total', 'totalVehicles', 'vehicleCount', 'totalCount']],
    ['Beroperasi', ['active', 'activeCount']],
    ['Berhenti', ['idle', 'idleCount']],
    ['Terlambat', ['delayed', 'delayedCount']],
    ['Offline', ['offline', 'offlineCount']],
  ];
  const values = defs
    .map(([label, names]) => [label, pick(payload, ...names)])
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v)));
  return values.length
    ? html`<section class="stats live-stats">
        ${values.map(([label, value]) => `<article class="stat-card"><span class="stat-label">${label}</span><strong class="stat-number">${number(value)}</strong></article>`).join('')}
      </section>`
    : '<div class="monitor-empty">Ringkasan armada belum tersedia.</div>';
}
