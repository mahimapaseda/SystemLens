/**
 * SystemLens Data Cache
 * 
 * Stores the last successful result for each module.
 * The IPC handler checks the cache first — if the cached value
 * is still fresh (within TTL), it returns immediately without
 * hitting the system APIs again.
 * 
 * This prevents the UI from triggering expensive system calls
 * on every React re-render or poll interval.
 */

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > ttlMs) return null
  return entry.data
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now() })
}

export function invalidate(key: string): void {
  store.delete(key)
}

export function invalidateAll(): void {
  store.clear()
}
