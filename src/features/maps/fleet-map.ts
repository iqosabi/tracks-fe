import * as L from 'leaflet';
import { getCartoKey } from '../../core/config/runtime';
import { query } from '../../shared/ui/dom';
import { markerHtml, markerSize, type MapTheme } from './marker-layout';
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
  setTheme(theme: MapTheme): void;
  destroy(): void;
}
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
  }: { onSelect?: (position: FleetPosition) => void; demo?: boolean; floating?: boolean } = {},
): FleetMap {
  container.innerHTML =
    '<div class="carto-canvas" aria-label="Peta armada CARTO interaktif"></div><div class="map-status" role="status">Memuat peta CARTO…</div><button type="button" class="map-fit" aria-label="Tampilkan semua kendaraan">⊞ <span>Semua armada</span></button><div class="map-key"><span><i class="map-status-dot normal"></i>Normal</span><span><i class="map-status-dot delay"></i>Delay / berhenti</span><span><i class="map-status-dot offline"></i>Tidak aktif</span><span><i class="map-status-dot overspeed"></i>Overspeed</span></div>';
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
  const key = getCartoKey();
  const tileUrl = (theme: MapTheme) =>
    `https://{s}.basemaps.cartocdn.com/${theme === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png${key ? '?key=' + encodeURIComponent(key) : ''}`;
  const tiles = L.tileLayer(tileUrl('dark'), {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let removed = false,
    failed = false,
    hasLoaded = false,
    initial = true;
  let currentTheme: MapTheme = 'dark';
  let positions: FleetPosition[] = [];
  function refreshStatus() {
    status.textContent =
      (!key
        ? 'Key CARTO belum diatur · buka Pengaturan. '
        : failed && !hasLoaded
          ? 'Basemap belum dapat dimuat · periksa koneksi. '
          : '') +
      (demo
        ? 'Posisi ilustrasi · demo'
        : positions.length
          ? positions.length + ' kendaraan dengan GPS'
          : 'Belum ada posisi GPS');
  }
  tiles.on('tileerror', () => {
    failed = true;
    refreshStatus();
  });
  tiles.on('tileload', () => {
    hasLoaded = true;
    refreshStatus();
  });
  function resizeMarkers() {
    container.style.setProperty('--bus-marker-size', markerSize(map.getZoom()) + 'px');
    container.style.setProperty(
      '--bus-label-size',
      Math.max(8, Math.min(11, 7 + map.getZoom() / 6)) + 'px',
    );
    container.classList.toggle('labels-hidden', map.getZoom() < 12);
  }
  map.on('zoomend', resizeMarkers);
  resizeMarkers();
  function fit() {
    if (positions.length === 1)
      map.setView([positions[0].lat, positions[0].lng], 15, { animate: false });
    else if (positions.length > 1)
      map.fitBounds(
        positions.map((p) => [p.lat, p.lng]),
        { padding: [70, 90], maxZoom: 15, animate: false },
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
      for (const position of positions) {
        const marker = L.marker([position.lat, position.lng], {
          icon: L.divIcon({
            className: 'fleet-map-marker compact-marker',
            html: markerHtml(position),
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          title: position.label,
          keyboard: true,
        }).addTo(layer);
        marker.on('click', () => onSelect(position));
        marker.getElement()?.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            onSelect(position);
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
      if (position) {
        map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16), { animate: false });
        // Leave the selected bus above the bottom detail panel on narrow screens.
        if (map.getSize().x < 700)
          map.panBy([0, Math.round(map.getSize().y * 0.18)], { animate: false });
      }
    },
    setTheme(theme) {
      if (theme === currentTheme) return;
      currentTheme = theme;
      failed = false;
      hasLoaded = false;
      tiles.setUrl(tileUrl(theme));
    },
    destroy() {
      removed = true;
      observer.disconnect();
      map.off('zoomend', resizeMarkers);
      map.stop();
      map.remove();
    },
  };
}
