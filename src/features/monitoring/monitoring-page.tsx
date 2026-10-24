import { useCallback, useState } from 'react';
import type { AuthClient } from '../../core/auth/client';
import type { TablePage } from '../../core/types';
import { apiFor } from '../../core/api/client';
import { DataTableView } from '../../shared/ui/data-table/data-table';
import { usePolling } from '../../shared/hooks/use-polling';
import { time, statusText } from '../../shared/data/formatters';
import { alertRows } from '../maps/data';
import { monitoringApi } from './api';
export function MonitoringPage({
  auth,
  view,
  revision,
}: {
  auth: AuthClient;
  view: 'fleet' | 'alerts';
  revision: number;
}) {
  const [page, setPage] = useState<TablePage>({ page: 1, limit: 25, q: '' }),
    [status, setStatus] = useState(''),
    [draft, setDraft] = useState(''),
    [auto, setAuto] = useState(true);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const api = monitoringApi(apiFor(auth));
      const payload = await (view === 'fleet'
        ? api.fleet({ ...page, status }, signal)
        : api.alerts(signal));
      return view === 'alerts' ? alertRows(payload) : payload;
    },
    [auth, view, page, status],
  );
  const state = usePolling(load, auto ? 15000 : 0, revision);
  const id = view === 'fleet' ? 'vehicles' : 'alerts';
  return (
    <>
      <div className="monitor-toolbar">
        <span id="poll-state" role="status">
          {state.busy
            ? 'Memperbarui data…'
            : state.updatedAt
              ? 'Terakhir diperbarui ' + time(state.updatedAt)
              : 'Belum ada data yang berhasil diterima.'}
        </span>
        <label>
          <input
            id="auto-poll"
            type="checkbox"
            checked={auto}
            onChange={(event) => setAuto(event.target.checked)}
          />{' '}
          Perbarui setiap 15 detik
        </label>
      </div>
      {view === 'fleet' ? (
        <form
          id="live-filter"
          className="filter-grid monitor-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setStatus(draft);
            setPage((value) => ({ ...value, page: 1 }));
          }}
        >
          <label className="field">
            Status kendaraan
            <select name="status" value={draft} onChange={(event) => setDraft(event.target.value)}>
              <option value="">Semua status</option>
              {['ACTIVE', 'IDLE', 'DELAYED', 'OFFLINE'].map((value) => (
                <option key={value} value={value}>
                  {statusText(value)}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-actions">
            <button
              type="button"
              id="reset-filter"
              className="button secondary"
              onClick={() => {
                setDraft('');
                setStatus('');
                setPage({ page: 1, limit: 25, q: '' });
              }}
            >
              Reset
            </button>
            <button type="submit" className="button primary">
              Terapkan filter
            </button>
          </div>
        </form>
      ) : null}
      <section className="panel monitor-panel">
        <div className="panel-heading">
          <div>
            <h2>{view === 'fleet' ? 'Armada live' : 'Peringatan armada'}</h2>
            <p>
              {view === 'fleet'
                ? 'Status dan posisi kendaraan terkini'
                : 'Kendaraan yang perlu diperhatikan'}
            </p>
          </div>
          <span className="muted">
            {state.updatedAt ? 'Diterima ' + time(state.updatedAt) : ''}
          </span>
        </div>
        {state.error ? (
          <div className="notice error" role="alert">
            {state.error}
            {state.data ? ' Data sebelumnya mungkin sudah tidak terbaru.' : ''}
          </div>
        ) : null}
        <div id={id + '-body'} className="monitor-body">
          <DataTableView
            payload={state.data}
            kind={id}
            remote={view === 'fleet'}
            serverSearch={view === 'fleet'}
            page={view === 'fleet' ? page : undefined}
            busy={state.busy}
            onChange={view === 'fleet' ? setPage : undefined}
          />
        </div>
      </section>
    </>
  );
}
