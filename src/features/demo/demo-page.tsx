import { useState } from 'react';
import type { ApiRecord, Notify } from '../../core/types';
import { DataTableView } from '../../shared/ui/data-table/data-table';
import { DialogView } from '../../shared/ui/react-dialog';
import { date, number } from '../../shared/data/formatters';
import { fleet } from './data';
const rows: ApiRecord[] = fleet.map(
  ([bodyNo, plateNo, routeName, status, speedKph, batteryPercent], index) => ({
    bodyNo,
    plateNo,
    routeName,
    status: status === 'Beroperasi' ? 'ACTIVE' : status === 'Berhenti' ? 'IDLE' : 'OFFLINE',
    speedKph,
    batteryPercent,
    receivedAt: new Date(Date.now() - (index + 1) * 1000).toISOString(),
  }),
);
export function DemoPage({ view, notify }: { view: 'fleet' | 'alerts'; notify: Notify }) {
  const [selected, setSelected] = useState<ApiRecord | null>(null);
  function exportCsv() {
    const csv = [
      ['Bus', 'Plat', 'Rute', 'Status', 'Kecepatan km/j', 'Baterai %', 'Waktu'],
      ...rows.map((row) => [
        row.bodyNo,
        row.plateNo,
        row.routeName,
        row.status,
        row.speedKph,
        row.batteryPercent,
        date(row.receivedAt),
      ]),
    ]
      .map((row) => row.map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tracks-armada-DEMO.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Data demo diekspor.');
  }
  return (
    <>
      <section className="panel fleet-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {view === 'fleet' ? 'Daftar armada' : 'Notifikasi armada'}{' '}
              <span className="mini-badge">Demo</span>
            </h2>
            <p>Data ilustrasi untuk menjelajahi workspace</p>
          </div>
          {view === 'fleet' ? (
            <button className="button secondary" id="export" onClick={exportCsv}>
              Ekspor CSV
            </button>
          ) : null}
        </div>
        <div id="demo-fleet-table">
          <DataTableView
            kind={view === 'fleet' ? 'vehicles' : 'alerts'}
            payload={
              view === 'fleet'
                ? rows
                : rows
                    .filter((row) => row.status !== 'ACTIVE')
                    .map((row) => ({ ...row, type: row.status }))
            }
            actions={(_row, index) =>
              `<button class="button secondary action-button" data-action="detail" data-index="${index}">Detail</button>`
            }
            onAction={(_action, row) => setSelected(row)}
          />
        </div>
      </section>
      {selected ? (
        <DialogView
          title={String(selected.bodyNo) + ' / ' + String(selected.plateNo)}
          onClose={() => setSelected(null)}
        >
          <span className="mini-badge">DATA DEMO</span>
          <p>{String(selected.routeName)}</p>
          <div className="detail-grid">
            <span>
              Kecepatan<strong>{number(selected.speedKph)} km/j</strong>
            </span>
            <span>
              Baterai GPS<strong>{number(selected.batteryPercent)}%</strong>
            </span>
            <span>
              Pembaruan<strong>{date(selected.receivedAt)}</strong>
            </span>
          </div>
        </DialogView>
      ) : null}
    </>
  );
}
