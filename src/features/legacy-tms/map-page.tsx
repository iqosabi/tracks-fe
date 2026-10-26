import '../maps/map.css';
import { useCallback, useMemo, useState } from 'react';
import { FleetCanvas } from '../maps/fleet-canvas';
import { delayText } from '../maps/data';
import type { MapTheme } from '../maps/marker-layout';
import { date, number } from '../../shared/data/formatters';
import { usePolling } from '../../shared/hooks/use-polling';
import { TmsClient } from './client';
import { liveSchema } from './contract';
import { liveRows, mapPositions } from './data';

export function LegacyMapPage({ client, revision }: { client: TmsClient; revision: number }) {
  const load = useCallback(
    async (signal: AbortSignal) => liveSchema.parse(await client.read('live', signal)),
    [client],
  );
  const state = usePolling(load, 15000, revision);
  const [theme, setTheme] = useState<MapTheme>('dark');
  const [search, setSearch] = useState(''),
    [operator, setOperator] = useState(''),
    [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [focusRequest, setFocusRequest] = useState(0);
  const select = useCallback((id: string) => {
    setSelectedId(id);
    setFocusRequest((n) => n + 1);
    setSearch('');
  }, []);
  const all = useMemo(() => (state.data ? mapPositions(liveRows(state.data)) : []), [state.data]);
  const positions = useMemo(
    () =>
      all.filter(
        (bus) =>
          (!operator || bus.operatorLabel === operator) && (!status || bus.status === status),
      ),
    [all, operator, status],
  );
  const selected = positions.find((bus) => bus.id === selectedId);
  const results = search.trim()
    ? positions
        .filter((bus) => bus.label.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 20)
    : [];
  const operators = [...new Set(all.map((bus) => bus.operatorLabel).filter(Boolean))];
  const statuses = [...new Set(all.map((bus) => bus.status).filter(Boolean))];
  return (
    <div className={`reference-map map-theme-${theme} legacy-map`}>
      <FleetCanvas
        positions={positions}
        selectedId={selectedId}
        onSelect={select}
        demo={false}
        focusRequest={focusRequest}
        theme={theme}
      />
      <div className="map-toolbar legacy-map-toolbar">
        <div className="map-search">
          <input
            type="search"
            aria-label="Cari bus TMS"
            placeholder="Cari bus…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <div className="map-search-results">
              {results.length ? (
                results.map((bus) => (
                  <button className="button" key={bus.id} onClick={() => select(bus.id)}>
                    {bus.label}
                  </button>
                ))
              ) : (
                <span>Bus tidak ditemukan</span>
              )}
            </div>
          ) : null}
        </div>
        <select
          aria-label="Operator TMS"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        >
          <option value="">Semua operator</option>
          {operators.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select aria-label="Status TMS" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="legacy-map-message" role={state.error ? 'alert' : 'status'}>
        {state.error ||
          (state.busy && !state.data
            ? 'Memuat posisi TMS…'
            : `${positions.length} bus dengan GPS · ${date(state.data?.generatedAt)}`)}
      </div>
      {selected ? (
        <aside className="map-floating-list">
          <article className="floating-bus-card" data-selected="true">
            <header>
              <strong>{selected.label}</strong>
              <button
                className="icon-button"
                aria-label="Tutup detail bus"
                onClick={() => setSelectedId(null)}
              >
                ×
              </button>
            </header>
            <dl>
              {[
                ['Bus', selected.label],
                ['Lat', number(selected.lat, 6)],
                ['Lon', number(selected.lng, 6)],
                ['Time bus', date(selected.busTime)],
                ['Delay', delayText(selected.delayMs)],
                ['Speed', selected.speed === null ? '—' : `${number(selected.speed, 1)} km/j`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </aside>
      ) : null}
      <div className="map-theme-switch" aria-label="Tema peta">
        {(['dark', 'light'] as const).map((value) => (
          <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>
            {value === 'dark' ? 'Dark' : 'Light'}
          </button>
        ))}
      </div>
    </div>
  );
}
