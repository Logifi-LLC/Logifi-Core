import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import {
  getSupabaseStorageKey,
  readCachedSupabaseSessionFromStorage,
  OFFLINE_SESSION_SNAPSHOT_KEY,
  writeOfflineSessionSnapshotToStorage,
  readOfflineSessionSnapshotFromStorage,
  clearOfflineSessionSnapshotFromStorage,
} from '../cachedSupabaseSession'

describe('cachedSupabaseSession', () => {
  const supabaseUrl = 'https://exampleproject.supabase.co'
  const storageKey = getSupabaseStorageKey(supabaseUrl)

  it('derives the Supabase auth storage key from project URL', () => {
    expect(storageKey).toBe('sb-exampleproject-auth-token')
  })

  it('reads a direct session object from localStorage', () => {
    const session = {
      access_token: 'token-123',
      refresh_token: 'refresh-123',
      expires_in: 3600,
      expires_at: 9999999999,
      token_type: 'bearer',
      user: { id: 'user-1', email: 'pilot@example.com' },
    } as Session

    const storage = {
      getItem: (key: string) => (key === storageKey ? JSON.stringify(session) : null),
    }

    expect(readCachedSupabaseSessionFromStorage(storage, storageKey)).toEqual(session)
  })

  it('reads nested currentSession payloads', () => {
    const session = {
      access_token: 'token-456',
      refresh_token: 'refresh-456',
      expires_in: 3600,
      expires_at: 9999999999,
      token_type: 'bearer',
      user: { id: 'user-2', email: 'crew@example.com' },
    } as Session

    const storage = {
      getItem: () => JSON.stringify({ currentSession: session }),
    }

    expect(readCachedSupabaseSessionFromStorage(storage, storageKey)?.user?.id).toBe('user-2')
  })

  it('returns null for malformed cache entries', () => {
    const storage = {
      getItem: () => '{not-json',
    }

    expect(readCachedSupabaseSessionFromStorage(storage, storageKey)).toBeNull()
  })

  it('writes and reads an app-owned offline session snapshot', () => {
    const store: Record<string, string> = {}
    const storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    }

    const session = {
      access_token: 'snap-access',
      refresh_token: 'snap-refresh',
      expires_in: 3600,
      expires_at: 9999999999,
      token_type: 'bearer',
      user: { id: 'offline-user', email: 'altitude@example.com' },
    } as Session

    writeOfflineSessionSnapshotToStorage(storage, session)
    expect(store[OFFLINE_SESSION_SNAPSHOT_KEY]).toBeTruthy()

    const loaded = readOfflineSessionSnapshotFromStorage(storage)
    expect(loaded?.user?.id).toBe('offline-user')
    expect(loaded?.access_token).toBe('snap-access')
    expect(loaded?.refresh_token).toBe('snap-refresh')

    clearOfflineSessionSnapshotFromStorage(storage)
    expect(readOfflineSessionSnapshotFromStorage(storage)).toBeNull()
  })

  it('ignores incomplete sessions when writing the offline snapshot', () => {
    const store: Record<string, string> = {}
    const storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    }

    writeOfflineSessionSnapshotToStorage(storage, {
      access_token: 'only-access',
      user: { id: 'x' },
    } as Session)

    expect(store[OFFLINE_SESSION_SNAPSHOT_KEY]).toBeUndefined()
  })
})
