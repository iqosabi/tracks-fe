import { statusText, number } from '../../shared/data/presentation';
import * as L from 'leaflet';
import { getCartoKey } from '../../core/config/runtime';
import { query } from '../../shared/ui/dom';
export { getCartoKey } from '../../core/config/runtime';
export interface FleetPosition {
  lat: number;
  lng: number;
  label: string;
  status?: string;
  id?: string;
  overspeed?: boolean;
  selected?: boolean;
}
export interface FleetMap {
  update(data: FleetPosition[]): void;
  fit(): void;
  focus(id: string): void;
  destroy(): void;
}

const escape = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
export const demoPositions: FleetPosition[] = [
  { lat: -6.244, lng: 106.8, label: 'TRK-001', status: 'ACTIVE' },
  { lat: -6.198, lng: 106.823, label: 'TRK-002', status: 'ACTIVE' },
  { lat: -6.207, lng: 106.824, label: 'TRK-003', status: 'IDLE' },
  { lat: -6.259, lng: 106.877, label: 'TRK-004', status: 'ACTIVE' },
  { lat: -6.3, lng: 106.821, label: 'TRK-005', status: 'OFFLINE' },
  { lat: -6.174, lng: 106.791, label: 'TRK-006', status: 'ACTIVE' },
];
export function createFleetMap(
  container: HTMLElement,
  {
    onSelect = () => {},
    demo = false,
    floating = false,
  }: { onSelect?: (position: FleetPosition) => void; demo?: boolean; floating?: boolean } = {},
): FleetMap {
  container.innerHTML =
    '<div class="carto-canvas" aria-label="Peta armada CARTO interaktif"></div><div class="map-status" role="status">Memuat peta CARTO…</div><button type="button" class="map-fit" aria-label="Tampilkan semua kendaraan">⊞ <span>Semua armada</span></button><div class="map-key"><span><i class="dot green"></i>Aktif</span><span><i class="dot amber"></i>Berhenti / tertunda</span><span><i class="dot gray"></i>Offline</span></div>';
  const status = query('.map-status', container);
  const map = L.map(query('.carto-canvas', container), {
    scrollWheelZoom: true,
    touchZoom: true,
    doubleClickZoom: true,
    zoomControl: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([-6.21, 106.827], 12);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const cartoKey = getCartoKey();
  const tiles = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' +
      (cartoKey ? '?key=' + encodeURIComponent(cartoKey) : ''),
    {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    },
  ).addTo(map);
  let removed = false,
    failed = false,
    hasLoaded = false,
    layer = L.layerGroup().addTo(map),
    initial = true;
  let positions: FleetPosition[] = [];
  const refreshStatus = () => {
    status.textContent =
      (!cartoKey
        ? 'Key CARTO belum diatur · buka Pengaturan. '
        : failed && !hasLoaded
          ? 'Basemap belum dapat dimuat · periksa koneksi. '
          : '') +
      (demo
        ? 'Posisi ilustrasi · demo'
        : positions.length
          ? positions.length + ' kendaraan dengan GPS'
          : 'Belum ada posisi GPS');
  };
  tiles.on('tileerror', () => {
    failed = true;
    refreshStatus();
  });
  tiles.on('tileload', () => {
    hasLoaded = true;
    refreshStatus();
  });
  function fit() {
    if (positions.length === 1)
      map.setView([positions[0].lat, positions[0].lng], 15, { animate: false });
    else if (positions.length > 1)
      map.fitBounds(
        positions.map((p) => [p.lat, p.lng]),
        { padding: [60, 65], maxZoom: 15, animate: false },
      );
  }
  query('.map-fit', container).onclick = fit;
  const observer = new ResizeObserver(() => {
    if (!removed) map.invalidateSize({ pan: false });
  });
  observer.observe(container);
  return {
    update(data) {
      positions = data.filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lng) <= 180,
      );
      layer.clearLayers();
      for (const p of positions) {
        const state = String(p.status || '').toUpperCase(),
          tone =
            state === 'OFFLINE'
              ? 'offline'
              : state === 'IDLE' || state === 'DELAY' || state === 'DELAYED'
                ? 'idle'
                : 'active';
        const label = escape(p.label || 'Kendaraan');
        const marker = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: 'fleet-map-marker' + (floating ? ' compact-marker' : ''),
            html: `<span class="map-vehicle-pill ${tone} ${p.overspeed ? 'overspeed' : ''} ${p.selected ? 'selected' : ''}"><svg class="bus-marker-icon" viewBox="0 0 32 36" aria-hidden="true"><rect x="4" y="2" width="24" height="29" rx="6" fill="currentColor"/><rect x="7" y="7" width="18" height="12" rx="2" fill="white"/><path d="M16 7v12" stroke="currentColor" stroke-width="2"/><rect x="10" y="3.5" width="12" height="2" rx="1" fill="white"/><circle cx="9" cy="25" r="2" fill="white"/><circle cx="23" cy="25" r="2" fill="white"/><path d="M11 27h10" stroke="white" stroke-width="2"/><rect x="6" y="30" width="5" height="5" rx="1.5" fill="#222"/><rect x="21" y="30" width="5" height="5" rx="1.5" fill="#222"/><path d="M2 11v7m28-7v7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>${!floating || p.overspeed || p.selected ? label : ''}</span>`,
            iconSize: floating ? [44, 48] : [115, 38],
            iconAnchor: floating ? [22, 24] : [57, 19],
          }),
          title: String(p.label),
          keyboard: true,
        }).addTo(layer);
        if (!floating)
          marker.bindPopup(
            `<div class="map-popup"><small>${demo ? 'DEMO VEHICLE' : 'FLEET MONITORING'}</small><strong>${label}</strong><p>${escape(statusText(p.status || 'Status tidak tersedia'))}</p><span>Lat ${number(p.lat, 6)} · Lon ${number(p.lng, 6)}</span></div>`,
          );
        marker.on('click', () => onSelect(p));
        if (floating)
          marker.getElement()?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onSelect(p);
            }
          });
      }
      refreshStatus();
      if (initial && positions.length) {
        fit();
        initial = false;
      }
    },
    fit,
    focus(id) {
      const position = positions.find((p) => p.id === id);
      if (position)
        map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16), { animate: false });
    },
    destroy() {
      removed = true;
      observer.disconnect();
      map.stop();
      map.remove();
    },
  };
}
