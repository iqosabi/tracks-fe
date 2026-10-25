import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { activityStore } from '../../core/activity/store';
export function LoadingPopup() {
  const pending = useSyncExternalStore(activityStore.subscribe, activityStore.snapshot, () => 0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(pending > 0), pending ? 180 : 220);
    return () => clearTimeout(timer);
  }, [pending > 0]);
  return visible
    ? createPortal(
        <div
          className="loading-popup"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="loading-popup"
        >
          <div className="loading-popup-card">
            <span className="loading-spinner" aria-hidden="true" />
            <div>
              <strong>Memuat data…</strong>
              <small>Mohon tunggu sebentar</small>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;
}
