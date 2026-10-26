import { useCallback } from 'react';
import { useRequest } from '../../shared/hooks/use-request';
import { number, date } from '../../shared/data/formatters';
import { liveSchema, rowsSchema, tenantSummarySchema, type ResourceId } from './contract';
import { TmsClient } from './client';
import { liveRows, menuRows } from './data';
import { LegacyTable, legacyColumns } from './table';
import type { ApiRecord } from '../../core/types';

export const liveLabels: Record<string, string> = {
  totalBuses: 'Total bus',
  active: 'Beroperasi',
  idle: 'Idle',
  stop: 'Stop',
  withHistory: 'Memiliki riwayat',
  withoutHistory: 'Tanpa riwayat',
  totalOperators: 'Total operator',
};
const tenantLabels: Record<string, string> = {
  totalTenants: 'Total tenant',
  activeTenants: 'Tenant aktif',
  inactiveTenants: 'Tenant nonaktif',
  totalFleetsSystem: 'Total armada sistem',
  totalUsersSystem: 'Total pengguna sistem',
  avgUsersPerTenant: 'Rata-rata pengguna / tenant',
};
export function LegacyStats({
  values,
  labels,
}: {
  values: ApiRecord;
  labels: Record<string, string>;
}) {
  return (
    <section className="legacy-stats">
      {Object.entries(labels).map(([key, label]) => (
        <article key={key}>
          <span>{label}</span>
          <strong>{number(values[key], 2)}</strong>
        </article>
      ))}
    </section>
  );
}
export function ResourcePage({
  client,
  resource,
  revision,
}: {
  client: TmsClient;
  resource: ResourceId;
  revision: number;
}) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data = await client.read(resource, signal);
      if (resource === 'live') {
        const live = liveSchema.parse(data);
        return {
          rows: liveRows(live),
          stats: { ...live.summary, totalOperators: live.totalOperators },
          labels: liveLabels,
          operators: live.byOperator,
          info: `Data dibuat ${date(live.generatedAt)} · Terakhir aktif ${date(live.summary.lastActive)} · Sumber: ${live.source} · Cakupan: ${live.scope} · Operator: ${live.operatorCode ?? 'Semua dalam akses sesi'}`,
        };
      }
      if (resource === 'tenantSummary') {
        const summary = tenantSummarySchema.parse(data);
        return {
          rows: summary.breakdown,
          stats: summary.overview,
          labels: tenantLabels,
          info: '',
          operators: null,
        };
      }
      let rows = rowsSchema.parse(data);
      if (resource === 'menus' || resource === 'myMenus') rows = menuRows(rows);
      if (resource === 'stations')
        rows = rows.map((row) => ({
          ...row,
          corridorsText: rowsSchema
            .parse(row.usedIn ?? [])
            .map((corridor) => `${String(corridor.code)} · ${String(corridor.name)}`)
            .join(', '),
        }));
      return { rows, stats: null, labels: {}, info: '', operators: null };
    },
    [client, resource],
  );
  const state = useRequest(load, true, revision);
  const kind = resource === 'myMenus' ? 'menus' : resource;
  return (
    <>
      {state.busy ? <p role="status">Memuat data TMS…</p> : null}
      {state.error ? (
        <div className="notice" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.data ? (
        <>
          {state.data.stats ? (
            <LegacyStats values={state.data.stats} labels={state.data.labels} />
          ) : null}
          {state.data.info ? <p className="legacy-caption">{state.data.info}</p> : null}
          {state.data.operators ? (
            <>
              <h2 className="legacy-section-title">Ringkasan per operator</h2>
              <LegacyTable rows={state.data.operators} columns={legacyColumns.operatorSummary} />
              <h2 className="legacy-section-title">Data bus</h2>
            </>
          ) : null}
          <LegacyTable key={resource} rows={state.data.rows} columns={legacyColumns[kind]} />
          <p className="legacy-caption">
            Data diterima {date(state.updatedAt)}. Pencarian dan pagination berlaku pada seluruh
            data dalam respons ini.
          </p>
        </>
      ) : null}
    </>
  );
}
