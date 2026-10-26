import './map.css';
import { useCallback, useMemo, useState } from 'react';
import { readPreference, writePreference } from '../../core/config/storage';
import { format, number, statusText } from '../../shared/data/formatters';
import { FleetCanvas } from './fleet-canvas';
import { delayText, type BusPosition } from './data';
import type { MapTheme } from './marker-layout';
function BusCard({
  bus,
  selected,
  onClose,
}: {
  bus: BusPosition;
  selected: boolean;
  onClose: () => void;
}) {
  const values = [
    ['Bus', bus.label],
    ['Lat', number(bus.lat, 6)],
    ['Lon', number(bus.lng, 6)],
    ['Time bus', format(bus.busTime, bus.busTimeFormat ?? 'date')],
    ['Delay', delayText(bus.delayMs)],
    ['Speed', bus.speed === null ? '—' : `${number(bus.speed, 0)} KM/J`],
  ];
  return (
    <article
      className={`floating-bus-card ${bus.overspeed ? 'overspeed' : ''}`}
      data-selected={selected}
    >
      <header>
        <div>
          <strong>{bus.label}</strong>
          <small>
            {bus.status === 'OFFLINE'
              ? 'Nonaktif'
              : bus.overspeed
                ? 'Overspeed'
                : statusText(bus.status)}
          </small>
        </div>
        {selected ? (
          <button className="icon-button" aria-label="Tutup detail bus" onClick={onClose}>
            ×
          </button>
        ) : null}
      </header>
      <dl>
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
interface Props {
  positions: BusPosition[];
  demo?: boolean;
  busy?: boolean;
  onRefresh: () => void;
  notice?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
}
export function FleetMapView({
  positions,
  demo = false,
  busy = false,
  onRefresh,
  notice = '',
  hasMore = false,
  onLoadMore,
}: Props) {
  const [theme, setTheme] = useState<MapTheme>(() =>
    readPreference('tracks-map-theme') === 'light' ? 'light' : 'dark',
  );
  const [operator, setOperator] = useState('');
  const [route, setRoute] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [search, setSearch] = useState('');
  const select = useCallback((id: string) => {
    setSelectedId(id);
    setFocusRequest((value) => value + 1);
    setSearch('');
  }, []);
  const operators = [
    ...new Set(positions.map((p) => p.operatorLabel).filter((value): value is string => !!value)),
  ].sort();
  const routes = [
    ...new Set(positions.map((p) => p.routeCode).filter((value): value is string => !!value)),
  ].sort();
  const visible = useMemo(
    () =>
      positions.filter(
        (p) =>
          (!operator || p.operatorLabel === operator) &&
          (!route || p.routeCode === route) &&
          (!status || (status === 'OVERSPEED' ? p.overspeed : p.status === status)),
      ),
    [positions, operator, route, status],
  );
  const selected = visible.find((p) => p.id === selectedId);
  const overspeed = visible.filter((p) => p.overspeed && p.id !== selected?.id);
  const matches = search.trim()
    ? visible
        .filter((p) => p.label.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 20)
    : [];
  return (
    <section
      className={`fleet-full-map reference-map map-theme-${theme}`}
      aria-label="Peta armada penuh"
    >
      <FleetCanvas
        positions={visible}
        selectedId={selected?.id ?? null}
        onSelect={select}
        demo={demo}
        focusRequest={focusRequest}
        theme={theme}
      />
      <div className="map-controls">
        <div className="map-search">
          <label className="field">
            Cari bus
            <input
              type="search"
              aria-label="Cari bus di peta"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kendaraan…"
            />
          </label>
          {search ? (
            <div className="map-search-results">
              {matches.length ? (
                matches.map((bus) => (
                  <button className="button secondary" key={bus.id} onClick={() => select(bus.id)}>
                    {bus.label}
                  </button>
                ))
              ) : (
                <p>Bus tidak ditemukan.</p>
              )}
            </div>
          ) : null}
        </div>
        <label className="field map-filter">
          <span className="sr-only">Operator di peta</span>
          <select
            aria-label="Operator di peta"
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
          >
            <option value="">Semua operator</option>
            {operators.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field map-filter">
          <span className="sr-only">Rute di peta</span>
          <select
            aria-label="Rute di peta"
            value={route}
            onChange={(event) => setRoute(event.target.value)}
          >
            <option value="">Semua rute{routes.length ? ` (${routes.length})` : ''}</option>
            {routes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field map-filter">
          <span className="sr-only">Status di peta</span>
          <select
            aria-label="Status di peta"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            {[
              ...new Set([
                'ACTIVE',
                'IDLE',
                'DELAY',
                'OFFLINE',
                'OVERSPEED',
                ...positions.map((bus) => bus.status).filter((value): value is string => !!value),
              ]),
            ].map((value) => (
              <option key={value} value={value}>
                {value === 'OFFLINE' ? 'Nonaktif' : statusText(value)}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" disabled={busy} onClick={onRefresh}>
          {busy ? 'Memuat…' : 'Perbarui'}
        </button>
        {hasMore && onLoadMore ? (
          <button className="button secondary" disabled={busy} onClick={onLoadMore}>
            Muat armada berikutnya
          </button>
        ) : null}
      </div>
      <div className="map-theme-switch" role="group" aria-label="Tampilan peta">
        {(['dark', 'light'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => {
              setTheme(value);
              writePreference('tracks-map-theme', value);
            }}
          >
            {value === 'dark' ? 'Dark' : 'Light'}
          </button>
        ))}
      </div>
      {notice ? (
        <div className="map-notice notice error" role="alert">
          {notice}
        </div>
      ) : null}
      {selected || overspeed.length ? (
        <aside className="map-floating-data" aria-label="Detail dan overspeed bus">
          {selected ? (
            <BusCard bus={selected} selected onClose={() => setSelectedId(null)} />
          ) : null}
          {overspeed.map((bus) => (
            <BusCard key={bus.id} bus={bus} selected={false} onClose={() => {}} />
          ))}
        </aside>
      ) : null}
    </section>
  );
}
