import type { MapTheme } from './marker-layout';
import { useEffect, useRef } from 'react';
import { createFleetMap, type FleetMap } from './fleet-map';
import type { BusPosition } from './data';
export function FleetCanvas({
  positions,
  selectedId,
  onSelect,
  demo,
  focusRequest,
  theme,
}: {
  positions: BusPosition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  demo: boolean;
  focusRequest: number;
  theme: MapTheme;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<FleetMap | null>(null);
  useEffect(() => {
    if (!container.current) return;
    map.current = createFleetMap(container.current, {
      demo,
      floating: true,
      onSelect: (position) => {
        if (position.id) onSelect(position.id);
      },
    });
    return () => {
      map.current?.destroy();
      map.current = null;
    };
  }, [demo, onSelect]);
  useEffect(() => {
    map.current?.update(positions.map((p) => ({ ...p, selected: p.id === selectedId })));
  }, [positions, selectedId]);
  useEffect(() => {
    if (selectedId) map.current?.focus(selectedId);
  }, [selectedId, focusRequest]);
  useEffect(() => {
    map.current?.setTheme(theme);
  }, [theme]);
  return <div className="fleet-full-canvas" ref={container} />;
}
