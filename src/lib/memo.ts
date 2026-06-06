/**
 * Per-source in-memory TTL cache. Single Map keyed by `namespace:key` so each
 * adapter gets its own namespace. Returns the cached value on hit; on miss,
 * runs the fetcher and caches its result. Failures are NOT cached so a flaky
 * upstream doesn't pin a transient error for the TTL.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function memoize<T>(
  namespace: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const fullKey = `${namespace}:${key}`;
  const now = Date.now();
  const hit = store.get(fullKey);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await fetcher();
  store.set(fullKey, { value, expiresAt: now + ttlMs });
  return value;
}

/** Test helper — clear all memoized entries (or just one namespace). */
export function memoClear(namespace?: string): void {
  if (namespace === undefined) {
    store.clear();
    return;
  }
  const prefix = `${namespace}:`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
