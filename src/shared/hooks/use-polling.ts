import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../core/api/errors';
import { isAbortError, messageOf } from '../data/guards';

/** One in-flight request; navigation aborts work and late responses cannot update state. */
export function usePolling<T>(
  load: (signal: AbortSignal) => Promise<T>,
  interval = 15000,
  refreshKey = 0,
) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [revision, setRevision] = useState(0);
  const retryAt = useRef(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active: AbortController | undefined;
    let blocked = false;
    async function run() {
      if (disposed || active || blocked) return;
      if (document.hidden || retryAt.current > Date.now()) {
        schedule();
        return;
      }
      active = new AbortController();
      setBusy(true);
      try {
        const result = await load(active.signal);
        if (disposed) return;
        setData(result);
        setError('');
        setUpdatedAt(new Date());
      } catch (reason) {
        if (disposed || isAbortError(reason)) return;
        if (reason instanceof ApiError) {
          if (reason.status === 429) retryAt.current = reason.retryAt;
          if (reason.status === 401 || reason.status === 403) blocked = true;
        }
        setError(messageOf(reason));
      } finally {
        active = undefined;
        if (!disposed) {
          setBusy(false);
          schedule();
        }
      }
    }
    function schedule() {
      clearTimeout(timer);
      if (!disposed && !blocked && interval > 0)
        timer = setTimeout(() => void run(), Math.max(interval, retryAt.current - Date.now()));
    }
    const visible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void run();
      }
    };
    document.addEventListener('visibilitychange', visible);
    void run();
    return () => {
      disposed = true;
      active?.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [load, interval, revision, refreshKey]);
  return { data, error, busy, updatedAt, refresh };
}
