import type { FetchOptions } from 'ofetch'

/**
 * Resolves `/api/*` paths to the production backend when `NUXT_PUBLIC_API_BASE` is set.
 * Required for Capacitor iOS builds (`nuxt generate` has no Nitro server in the bundle).
 */
export function resolveApiUrl(path: string): string {
  if (!path.startsWith('/api/')) return path

  try {
    const config = useRuntimeConfig()
    const base = String(config.public.apiBase || '').replace(/\/$/, '')
    if (!base) return path
    return `${base}${path}`
  } catch {
    return path
  }
}

/** `$fetch` wrapper that prefixes `/api/*` with `NUXT_PUBLIC_API_BASE` when configured. */
export function apiFetch<T>(path: string, opts?: FetchOptions<'json'>): Promise<T> {
  return $fetch<T>(resolveApiUrl(path), opts)
}
