import { html } from '../../shared/ui/html';
import { icon } from '../../shared/ui/icons';
import { summaryCards } from '../../shared/data/presentation';
export const fleet: [string, string, string, string, number, number, string][] = [
  ['TRK-001', 'B 7281 TGD', 'Koridor 1 · Blok M – Kota', 'Beroperasi', 42, 86, '2 detik lalu'],
  ['TRK-002', 'B 7312 TGD', 'Koridor 1 · Blok M – Kota', 'Beroperasi', 35, 74, '4 detik lalu'],
  ['TRK-003', 'B 7456 TGD', 'Koridor 6 · Ragunan – Dukuh Atas', 'Berhenti', 0, 63, '8 detik lalu'],
  [
    'TRK-004',
    'B 7120 TGD',
    'Koridor 9 · Pinang Ranti – Pluit',
    'Beroperasi',
    28,
    91,
    '3 detik lalu',
  ],
  ['TRK-005', 'B 7689 TGD', 'Koridor 6 · Ragunan – Dukuh Atas', 'Offline', 0, 32, '24 menit lalu'],
  [
    'TRK-006',
    'B 7203 TGD',
    'Koridor 9 · Pinang Ranti – Pluit',
    'Beroperasi',
    46,
    78,
    '6 detik lalu',
  ],
];
function stats(): string {
  return summaryCards({ total: 128, active: 104, idle: 18, delayed: 0, offline: 6 });
}
function overview() {
  return html`${stats()}
    <section class="overview-middle">
      ${mapPanel()}
      <article class="panel activity-panel">
        <div class="panel-heading">
          <div>
            <h2>Aktivitas terbaru</h2>
            <p>Peristiwa operasional armada</p>
          </div>
          <span class="soft-icon">${icon('clock')}</span>
        </div>
        <div class="timeline">
          ${[
            ['green', 'Armada kembali beroperasi', 'TRK-002 · Koridor 1', '2 menit lalu'],
            ['amber', 'Kendaraan berhenti', 'TRK-003 · Dukuh Atas', '8 menit lalu'],
            ['gray', 'Koneksi perangkat terputus', 'TRK-005 · Koridor 6', '24 menit lalu'],
            ['green', 'Armada mulai perjalanan', 'TRK-004 · Pinang Ranti', '32 menit lalu'],
          ]
            .map(
              ([color, title, desc, time]) =>
                `<div class="activity"><span class="activity-icon ${color}">${icon(color === 'gray' ? 'shield' : 'bus')}</span><div><strong>${title}</strong><p>${desc}</p><small>${time}</small></div></div>`,
            )
            .join('')}
        </div>
        <button data-page="alerts" class="activity-footer">
          Lihat semua aktivitas ${icon('arrow')}
        </button>
      </article>
    </section>
    ${fleetPanel(true)}`;
}
function mapPanel(full = false): string {
  return html`<article class="panel map-panel ${full ? 'full-map' : ''}">
    <div class="panel-heading">
      <div>
        <h2>Jelajahi armada <span class="mini-badge">Demo</span></h2>
        <p>Posisi ilustrasi di peta Jakarta · CARTO</p>
      </div>
      <button class="text-button" ${full ? 'id="map-reset"' : 'data-page="map"'}>
        ${full ? 'Semua armada' : 'Buka peta'} ${icon(full ? 'refresh' : 'arrow')}
      </button>
    </div>
    <div id="demo-carto-map" class="carto-demo-region"></div>
  </article>`;
}

function fleetPanel(compact: boolean): string {
  return html`<section class="panel fleet-panel">
    <div class="panel-heading">
      <div>
        <h2>Daftar armada <span class="mini-badge">Demo</span></h2>
        <p>Data sampel kendaraan untuk menjelajahi workspace</p>
      </div>
      ${!compact ? `<button class="button secondary" id="export">${icon('download')} Ekspor CSV</button>` : `<button class="button secondary" data-page="fleet">Semua armada ${icon('arrow')}</button>`}
    </div>
    <div id="demo-fleet-table"></div>
  </section>`;
}

function alertsContent() {
  return html`<section class="panel alerts-list">
    <div class="panel-heading">
      <div>
        <h2>Notifikasi armada</h2>
        <p>3 peristiwa ilustrasi untuk ditinjau</p>
      </div>
    </div>
    ${[
      [
        'Offline',
        'Koneksi perangkat terputus',
        'TRK-005 belum mengirim data selama 24 menit.',
        'TRK-005',
      ],
      ['Berhenti', 'Kendaraan berhenti', 'TRK-003 berhenti di area Dukuh Atas.', 'TRK-003'],
      [
        'Beroperasi',
        'Perjalanan dimulai',
        'TRK-004 mulai beroperasi dari Pinang Ranti.',
        'TRK-004',
      ],
    ]
      .map(
        ([status, title, desc, id]) =>
          `<button class="alert-row" data-vehicle="${id}"><span class="activity-icon ${status === 'Offline' ? 'gray' : status === 'Berhenti' ? 'amber' : 'green'}">${icon('bell')}</span><span><strong>${title}</strong><p>${desc}</p></span>${icon('chevron')}</button>`,
      )
      .join('')}
  </section>`;
}
export function demoView(page: string): string {
  return page === 'overview'
    ? overview()
    : page === 'fleet'
      ? fleetPanel(false)
      : page === 'map'
        ? mapPanel(true)
        : alertsContent();
}
