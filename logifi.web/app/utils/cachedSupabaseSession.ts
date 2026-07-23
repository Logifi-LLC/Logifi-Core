import type { Session } from '@supabase/supabase-js'
import { getSupabaseConfig } from '~/config/supabase'

/** App-owned backup of the last good session; survives SDK localStorage wipes. */
export const OFFLINE_SESSION_SNAPSHOT_KEY = 'logifi-offline-session'

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

export function writeOfflineSessionSnapshotToStorage(
  storage: Pick<Storage, 'setItem'>,
  session: Session
): void {
  if (
    typeof session.access_token !== 'string' ||
    !session.access_token ||
    !session.user ||
    typeof session.refresh_token !== 'string' ||
    !session.refresh_token
  ) {
    return
  }

  storage.setItem(
    OFFLINE_SESSION_SNAPSHOT_KEY,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type ?? 'bearer',
      user: session.user,
    })
  )
}

export function writeOfflineSessionSnapshot(session: Session): void {
  if (typeof window === 'undefined') return
  try {
    writeOfflineSessionSnapshotToStorage(window.localStorage, session)
  } catch (err) {
    console.warn('[cachedSupabaseSession] Failed to write offline snapshot:', err)
  }
}

export function readOfflineSessionSnapshotFromStorage(
  storage: Pick<Storage, 'getItem'>
): Session | null {
  const raw = storage.getItem(OFFLINE_SESSION_SNAPSHOT_KEY)
  if (!raw) return null
  return parseStoredSession(raw)
}

export function readOfflineSessionSnapshot(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    return readOfflineSessionSnapshotFromStorage(window.localStorage)
  } catch {
    return null
  }
}

export function clearOfflineSessionSnapshotFromStorage(
  storage: Pick<Storage, 'removeItem'>
): void {
  storage.removeItem(OFFLINE_SESSION_SNAPSHOT_KEY)
}

export function clearOfflineSessionSnapshot(): void {
  if (typeof window === 'undefined') return
  try {
    clearOfflineSessionSnapshotFromStorage(window.localStorage)
  } catch (err) {
    console.warn('[cachedSupabaseSession] Failed to clear offline snapshot:', err)
  }
}

/** Prefer SDK cache, then app-owned offline snapshot. */
export function readBestCachedSession(): Session | null {
  return readCachedSupabaseSession() ?? readOfflineSessionSnapshot()
}
