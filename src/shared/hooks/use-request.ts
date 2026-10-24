import { useEffect, useState } from 'react';
import { isAbortError, messageOf } from '../data/guards';
/** Read-only query lifecycle. Mutations belong in event handlers, never effects. */
export function useRequest<T>(
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
  refreshKey = 0,
) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(enabled),
    [updatedAt, setUpdatedAt] = useState<Date>();
  useEffect(() => {
    if (!enabled) {
      setBusy(false);
      return;
    }
    const abort = new AbortController();
    setBusy(true);
    setData(undefined);
    setError('');
    void load(abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          setData(result);
          setUpdatedAt(new Date());
        }
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted && !isAbortError(reason)) setError(messageOf(reason));
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [load, enabled, refreshKey]);
  return { data, error, busy, updatedAt };
}
