export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function browserStorage(): StorageAdapter | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readPreference(key: string): string | null {
  try {
    return browserStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    /* Preferences are optional. */
  }
}

export function removePreference(key: string): void {
  try {
    browserStorage()?.removeItem?.(key);
  } catch {
    /* Preferences are optional. */
  }
}
