import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import {
  getSupabaseStorageKey,
  readCachedSupabaseSessionFromStorage,
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
})
