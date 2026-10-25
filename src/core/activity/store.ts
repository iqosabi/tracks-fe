let pending = 0;
const listeners = new Set<() => void>();
function publish() {
  for (const listener of listeners) listener();
}
export const activityStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  snapshot() {
    return pending;
  },
};
/** Every request releases its own activity, including failures and cancellations. */
export async function withActivity<T>(work: () => Promise<T>): Promise<T> {
  pending++;
  publish();
  try {
    return await work();
  } finally {
    pending--;
    publish();
  }
}
