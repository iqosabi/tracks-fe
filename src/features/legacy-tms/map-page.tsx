import { useCallback } from 'react';
import { usePolling } from '../../shared/hooks/use-polling';
import { FleetMapView } from '../maps/fleet-map-view';
import type { BusPosition } from '../maps/data';
import type { TmsClient } from './client';
import { loadTmsMap } from './map-api';
const noPositions: BusPosition[] = [];
export function LegacyMapPage({ client, revision }: { client: TmsClient; revision: number }) {
  const load = useCallback((signal: AbortSignal) => loadTmsMap(client, signal), [client]);
  const state = usePolling(load, 15000, revision);
  const notice = [
    state.error
      ? `${state.error}${state.data ? ' Posisi sebelumnya mungkin sudah tidak terbaru.' : ''}`
      : '',
    state.data?.notice,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <FleetMapView
      positions={state.data?.positions ?? noPositions}
      busy={state.busy}
      onRefresh={state.refresh}
      notice={notice}
    />
  );
}
