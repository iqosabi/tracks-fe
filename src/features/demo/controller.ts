import type { FeatureController, Notify } from '../../core/types';
import { createDataTable } from '../../shared/ui/data-table';
import { createFleetMap } from '../maps/fleet-map';
import { demoPositions } from '../maps/fleet-map';
import { fleet } from './view';
import { escape, number } from '../../shared/data/presentation';
import { openDialog } from '../../shared/ui/dialog';

function vehicleDetail(id: string): void {
  const vehicle = fleet.find((row) => row[0] === id);
  if (!vehicle) return;
  const [name, plate, route, status, speed, battery, updated] = vehicle;
  openDialog(
    `${name} / ${plate}`,
    `
    <span class="mini-badge">DATA DEMO</span><p>${escape(route)}</p>
    <div class="detail-grid">
      <span>Status<strong>${escape(status)}</strong></span>
      <span>Kecepatan<strong>${number(speed)} km/j</strong></span>
      <span>Baterai GPS<strong>${number(battery)}%</strong></span>
      <span>Pembaruan<strong>${escape(updated)}</strong></span>
    </div>
    <div class="notice">Data ilustrasi, bukan kendaraan aktual.</div>`,
  );
}

/** Demo interactions deliberately have no reference to the authenticated API client. */
export function mountDemo(element: HTMLElement, page: string, notify: Notify): FeatureController {
  const events = new AbortController();
  const tableElement = element.querySelector<HTMLElement>('#demo-fleet-table');
  const table = tableElement
    ? createDataTable({
        element: tableElement,
        kind: 'vehicles',
        pageSize: page === 'overview' ? 5 : 10,
        actions: (row) =>
          `<button class="button secondary action-button" data-vehicle="${escape(row.bodyNo)}">Detail</button>`,
      })
    : null;
  table?.setData(
    fleet.map(([bodyNo, plateNo, routeName, status, speedKph, batteryPercent]) => ({
      bodyNo,
      plateNo,
      routeName,
      status: status === 'Beroperasi' ? 'ACTIVE' : status === 'Berhenti' ? 'IDLE' : 'OFFLINE',
      speedKph,
      batteryPercent,
    })),
  );
  const mapElement = element.querySelector<HTMLElement>('#demo-carto-map');
  const map = mapElement
    ? createFleetMap(mapElement, {
        demo: true,
        onSelect: (position) => vehicleDetail(position.label),
      })
    : null;
  map?.update(demoPositions);
  element.addEventListener(
    'click',
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-vehicle]')
          : null;
      if (button?.dataset.vehicle) vehicleDetail(button.dataset.vehicle);
    },
    { signal: events.signal },
  );
  element
    .querySelector<HTMLElement>('#map-reset')
    ?.addEventListener('click', () => map?.fit(), { signal: events.signal });
  element.querySelector<HTMLElement>('#export')?.addEventListener(
    'click',
    () => {
      const selected = table?.filteredRows.map((row) => row.bodyNo);
      const rows = fleet.filter((row) => !selected || selected.includes(row[0]));
      const csv = [
        ['ID', 'Plat', 'Rute', 'Status', 'Kecepatan km/j', 'Baterai %', 'Pembaruan'],
        ...rows,
      ]
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
        .join('\r\n');
      const url = URL.createObjectURL(
        new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tracks-armada-DEMO.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      notify('Data demo diekspor.');
    },
    { signal: events.signal },
  );
  return {
    async refresh() {
      notify('Tampilan diperbarui. Data ini adalah ilustrasi demo.');
    },
    destroy() {
      events.abort();
      table?.destroy();
      map?.destroy();
    },
  };
}
