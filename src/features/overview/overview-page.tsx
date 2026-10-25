import { useCallback } from 'react';
import type { AuthClient } from '../../core/auth/client';
import type { Role } from '../../core/auth/schema';
import { apiFor } from '../../core/api/client';
import { usePolling } from '../../shared/hooks/use-polling';
import { time } from '../../shared/data/formatters';
import { loadCounts, loadFleetSummary } from './api';
import { fleetMetrics, type Metric } from './data';
function Cards({ metrics, fleet = false }: { metrics: Metric[]; fleet?: boolean }) {
  return (
    <section className={fleet ? 'stats live-stats' : 'stats'}>
      {metrics.map((metric) => (
        <article className="stat-card" key={metric.label}>
          <span className="stat-label">{metric.label}</span>
          <strong className={metric.text ? 'stat-value' : 'stat-number'}>{metric.value}</strong>
          {metric.note ? <small className="muted">{metric.note}</small> : null}
          {metric.error ? (
            <small className="metric-error" title={metric.error}>
              Data belum tersedia
            </small>
          ) : null}
        </article>
      ))}
    </section>
  );
}
export function OverviewPage({
  auth,
  role,
  demo,
  revision,
}: {
  auth: AuthClient;
  role: Role;
  demo: boolean;
  revision: number;
}) {
  const loadSummary = useCallback(
    async (signal: AbortSignal) => {
      return demo
        ? { total: 128, active: 104, idle: 18, delayed: 0, offline: 6, overspeed: 1 }
        : loadFleetSummary(apiFor(auth), signal);
    },
    [auth, demo],
  );
  const loadInventory = useCallback(
    async (signal: AbortSignal) => {
      return demo
        ? [
            { label: 'Bus terdaftar', value: '128' },
            { label: 'Rute', value: '12' },
            { label: 'Perangkat', value: '128' },
            { label: 'Laporan bantuan', value: '8' },
            { label: 'Laporan terbuka', value: '3' },
            { label: 'Laporan ditangani', value: '2' },
          ]
        : loadCounts(apiFor(auth), role, signal);
    },
    [auth, role, demo],
  );
  const summary = usePolling(loadSummary, 15000, revision);
  const inventory = usePolling(loadInventory, 60000, revision);
  return (
    <div className="overview-cards">
      <div className="monitor-toolbar">
        <span role="status">
          {demo
            ? 'Data ilustrasi'
            : `Cakupan ${role === 'SUPER_ADMIN' ? 'seluruh operator' : 'operator akun Anda'}`}{' '}
          · {summary.updatedAt ? `Diperbarui ${time(summary.updatedAt)}` : 'Memuat ringkasan…'}
        </span>
      </div>
      {summary.error ? (
        <div className="notice error" role="alert">
          {summary.error}
          {summary.data ? ' Data sebelumnya mungkin sudah tidak terbaru.' : ''}
        </div>
      ) : null}
      <h2>Kondisi armada</h2>
      {summary.updatedAt ? (
        <Cards fleet metrics={fleetMetrics(summary.data)} />
      ) : (
        <p className="monitor-empty">
          {summary.error ? 'Ringkasan belum tersedia.' : 'Memuat kondisi armada…'}
        </p>
      )}
      <h2>Data operasional</h2>
      {inventory.error ? (
        <div role="alert" className="notice error">
          {inventory.error}
        </div>
      ) : null}
      <Cards metrics={inventory.data ?? []} />
      <p className="muted">
        {demo
          ? 'Angka demo untuk ilustrasi.'
          : 'Data mengikuti izin dan scope sesi API. Nilai — berarti data belum tersedia. Jumlah ≥ menandakan pemuatan belum lengkap.'}
      </p>
    </div>
  );
}
