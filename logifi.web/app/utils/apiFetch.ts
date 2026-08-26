import type { FetchOptions } from 'ofetch'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { canonicalizeApiBase } from './apiBase'

/**
 * Resolves `/api/*` paths to the remote backend (`NUXT_PUBLIC_API_BASE`) on the native
 * Capacitor app, which has no bundled Nitro server (`nuxt generate`).
 *
 * In the browser — local dev and the deployed web app — the path is left relative so it hits
 * whatever origin is serving the app. This avoids cross-origin calls (e.g. `pnpm dev` on
 * localhost trying to reach the production domain).
 */
export function resolveApiUrl(path: string): string {
  if (!path.startsWith('/api/')) return path
  if (!isCapacitorNative()) return path

  try {
    const config = useRuntimeConfig()
    const base = canonicalizeApiBase(String(config.public.apiBase || ''))
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
