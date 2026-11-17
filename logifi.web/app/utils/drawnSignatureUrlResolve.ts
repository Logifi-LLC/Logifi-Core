const DRAWN_SIGNATURE_URL_CACHE_MS = 50 * 60 * 1000

type CacheEntry = { url: string | null; expiresAt: number }

const urlCache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<string | null>>()

export function drawnSignatureUrlCacheKey(entryId: string, storagePath: string): string {
  return `${entryId}\0${storagePath}`
}

export function clearDrawnSignatureUrlCache(): void {
  urlCache.clear()
  inFlight.clear()
}

/** Resolves a display URL once per (entryId, path); reuses cache until expiry (~50 min). */
export async function resolveDrawnSignatureUrlCached(
  entryId: string,
  storagePath: string,
  resolve: (entryId: string, storagePath: string) => Promise<string | null>
): Promise<string | null> {
  const key = drawnSignatureUrlCacheKey(entryId, storagePath)
  const now = Date.now()
  const cached = urlCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.url
  }

  const existing = inFlight.get(key)
  if (existing) {
    return existing
  }

  const promise = (async () => {
    try {
      const url = await resolve(entryId, storagePath)
      urlCache.set(key, { url, expiresAt: Date.now() + DRAWN_SIGNATURE_URL_CACHE_MS })
      return url
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, promise)
  return promise
}