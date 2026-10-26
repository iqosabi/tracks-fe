import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFor } from '../../core/api/client';
import type { AuthClient } from '../../core/auth/client';
import { usePolling } from '../../shared/hooks/use-polling';
import { loadMap } from './api';
import { withBusFreshness, defaultOfflineAfterMs, type BusPosition } from './data';
import { demoPositions } from './fleet-map';
import { FleetMapView } from './fleet-map-view';
const noPositions: BusPosition[] = [];
export function MapPage({
  auth,
  demo,
  revision,
}: {
  auth: AuthClient;
  demo: boolean;
  revision: number;
}) {
  const [pageLimit, setPageLimit] = useState(25),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
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
        offlineAfterMs: defaultOfflineAfterMs,
      };
    },
    [auth, demo, pageLimit],
  );
  const state = usePolling(load, 15000, revision);
  const positions = useMemo(
    () =>
      (state.data?.positions ?? noPositions).map((bus) =>
        withBusFreshness(
          bus,
          Math.max(now, state.updatedAt?.getTime() ?? now),
          state.data?.offlineAfterMs,
        ),
      ),
    [state.data, state.updatedAt, now],
  );
  const notice = [
    state.error
      ? `${state.error}${state.data ? ' Posisi sebelumnya mungkin sudah tidak terbaru.' : ''}`
      : '',
    state.data?.truncated
      ? `Cakupan belum lengkap setelah ${pageLimit} halaman. Gunakan tombol Muat armada berikutnya.`
      : '',
    state.data?.alertError ? `Data overspeed belum lengkap: ${state.data.alertError}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <FleetMapView
      positions={positions}
      demo={demo}
      busy={state.busy}
      onRefresh={state.refresh}
      notice={notice}
      hasMore={state.data?.truncated}
      onLoadMore={() => setPageLimit((n) => n + 25)}
    />
  );
}
