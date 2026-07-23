import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { useAuth, __resetAuthForTests } from '../useAuth'
import {
  writeOfflineSessionSnapshot,
  readOfflineSessionSnapshot,
  clearOfflineSessionSnapshot,
} from '~/utils/cachedSupabaseSession'

const authListeners: Array<(event: string, session: Session | null) => void> = []

vi.mock('~/config/supabase', () => ({
  getSupabaseConfig: () => ({
    url: 'https://exampleproject.supabase.co',
    anonKey: 'test-anon-key',
  }),
}))

vi.mock('~/lib/supabase', () => ({
  isSupabaseAvailable: () => true,
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: Session | null) => void) => {
        authListeners.push(cb)
        return { data: { subscription: { unsubscribe: () => undefined } } }
      },
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      stopAutoRefresh: vi.fn(async () => undefined),
      startAutoRefresh: vi.fn(async () => undefined),
      setSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}))

const offlineState = {
  isOnline: true,
  connectivityReady: true,
}

vi.mock('../useOffline', () => ({
  useOffline: () => ({
    get isOnline() {
      return { value: offlineState.isOnline }
    },
    get connectivityReady() {
      return { value: offlineState.connectivityReady }
    },
  }),
}))

function makeSession(id = 'pilot-1'): Session {
  return {
    access_token: `access-${id}`,
    refresh_token: `refresh-${id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: { id, email: `${id}@example.com` } as Session['user'],
  }
}

describe('useAuth offline session retention', () => {
  beforeEach(() => {
    authListeners.length = 0
    offlineState.isOnline = true
    offlineState.connectivityReady = true
    clearOfflineSessionSnapshot()
    __resetAuthForTests()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
  })

  it('keeps the session on SIGNED_OUT while cloud is offline', async () => {
    offlineState.isOnline = false
    offlineState.connectivityReady = true

    const session = makeSession()
    writeOfflineSessionSnapshot(session)

    const auth = useAuth()
    auth.session.value = session
    auth.user.value = session.user

    await auth.initAuth()
    expect(authListeners.length).toBeGreaterThan(0)

    for (const listener of authListeners) {
      await listener('SIGNED_OUT', null)
    }

    expect(auth.user.value?.id).toBe('pilot-1')
    expect(auth.session.value?.access_token).toBe('access-pilot-1')
  })

  it('clears the session on explicit signOut even when offline', async () => {
    offlineState.isOnline = false
    offlineState.connectivityReady = true

    const session = makeSession('logout-user')
    writeOfflineSessionSnapshot(session)

    const auth = useAuth()
    auth.session.value = session
    auth.user.value = session.user

    await auth.initAuth()
    const result = await auth.signOut()

    expect(result.success).toBe(true)
    expect(auth.user.value).toBeNull()
    expect(auth.session.value).toBeNull()
    expect(readOfflineSessionSnapshot()).toBeNull()
  })

  it('clears the session on SIGNED_OUT when online', async () => {
    offlineState.isOnline = true
    offlineState.connectivityReady = true

    const session = makeSession('online-user')

    const auth = useAuth()
    auth.session.value = session
    auth.user.value = session.user

    await auth.initAuth()
    expect(authListeners.length).toBeGreaterThan(0)

    for (const listener of authListeners) {
      await listener('SIGNED_OUT', null)
    }

    expect(auth.user.value).toBeNull()
    expect(auth.session.value).toBeNull()
  })
})
