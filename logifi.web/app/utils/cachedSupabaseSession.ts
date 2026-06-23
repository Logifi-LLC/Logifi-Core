import type { Session } from '@supabase/supabase-js'
import { getSupabaseConfig } from '~/config/supabase'

export function getSupabaseStorageKey(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${ref}-auth-token`
}

function parseStoredSession(raw: string): Session | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const session =
      (parsed.currentSession as Session | undefined) ??
      (parsed.session as Session | undefined) ??
      (parsed as unknown as Session)

    if (
      session &&
      typeof session.access_token === 'string' &&
      session.access_token.length > 0 &&
      session.user
    ) {
      return session
    }
  } catch {
    // Ignore malformed cache entries.
  }

  return null
}

export function readCachedSupabaseSessionFromStorage(
  storage: Pick<Storage, 'getItem'>,
  storageKey: string
): Session | null {
  const raw = storage.getItem(storageKey)
  if (!raw) return null
  return parseStoredSession(raw)
}

export function readCachedSupabaseSession(): Session | null {
  if (typeof window === 'undefined') return null

  const config = getSupabaseConfig()
  if (!config?.url) return null

  return readCachedSupabaseSessionFromStorage(
    window.localStorage,
    getSupabaseStorageKey(config.url)
  )
}
