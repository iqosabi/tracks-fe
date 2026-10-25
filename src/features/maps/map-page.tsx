import { useCallback, useState } from 'react';
import type { AuthClient } from '../../core/auth/client';
import { apiFor } from '../../core/api/client';
import { usePolling } from '../../shared/hooks/use-polling';
import { date, number, time, statusText } from '../../shared/data/formatters';
import { demoPositions } from './fleet-map';
import { FleetCanvas } from './fleet-canvas';
import { delayText, type BusPosition } from './data';
import { loadMap } from './api';
const noPositions: BusPosition[] = [];
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
    ['Time bus', date(bus.busTime)],
    ['Delay', delayText(bus.delayMs)],
    ['Speed', bus.speed === null ? '—' : `${number(bus.speed, 1)} km/j`],
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
            {bus.overspeed ? 'Overspeed' : statusText(bus.status)}
            {selected ? ' · Dipilih' : ''}
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
export function MapPage({
  auth,
  demo,
  revision,
}: {
  auth: AuthClient;
  demo: boolean;
  revision: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageLimit, setPageLimit] = useState(25);
  const [focusRequest, setFocusRequest] = useState(0);
  const [search, setSearch] = useState('');
  const select = useCallback((id: string) => {
    setSelectedId(id);
    setFocusRequest((value) => value + 1);
    setSearch('');
  }, []);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!demo) return loadMap(apiFor(auth), signal, pageLimit);
      return {
        positions: demoPositions.map((p, index) => ({
          ...p,
          id: `demo-${index}`,
          overspeed: index === 0,
          speed: index === 0 ? 92 : index === 4 ? 0 : 42,
          busTime: new Date(Date.now() - 2500).toISOString(),
          delayMs: 1250,
        })),
        truncated: false,
        alertError: '',
      };
    },
    [auth, demo, pageLimit],
  );
  const state = usePolling(load, 15000, revision);
  const positions = state.data?.positions ?? noPositions;
  const selected = positions.find((p) => p.id === selectedId);
  const overspeed = positions.filter((p) => p.overspeed && p.id !== selected?.id);
  const matches = search.trim()
    ? positions
        .filter((p) => p.label.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 20)
    : [];
  return (
    <section className="fleet-full-map" aria-label="Peta armada penuh">
      <FleetCanvas
        positions={positions}
        selectedId={selected?.id ?? null}
        onSelect={select}
        demo={demo}
        focusRequest={focusRequest}
      />
      <div className="map-controls">
        <label className="field">
          Cari bus
          <input
            type="search"
            aria-label="Cari bus di peta"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nomor bus…"
          />
        </label>
        <button className="button secondary" disabled={state.busy} onClick={state.refresh}>
          {state.busy ? 'Memuat…' : 'Perbarui'}
        </button>
        {state.data?.truncated ? (
          <button
            className="button secondary"
            disabled={state.busy}
            onClick={() => setPageLimit((value) => value + 25)}
          >
            Muat armada berikutnya
          </button>
        ) : null}
        <small role="status">
          {demo ? 'Demo · ' : ''}
          {state.updatedAt ? time(state.updatedAt) : 'Menghubungkan…'}
        </small>
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
      {state.error || state.data?.truncated || state.data?.alertError ? (
        <div className="map-notice notice error" role="alert">
          {state.error
            ? `${state.error}${state.data ? ' Posisi sebelumnya mungkin sudah tidak terbaru.' : ''}`
            : ''}
          {state.data?.truncated
            ? ` Cakupan belum lengkap setelah ${pageLimit} halaman. Gunakan tombol Muat armada berikutnya.`
            : ''}
          {state.data?.alertError ? ` Data overspeed belum lengkap: ${state.data.alertError}` : ''}
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
