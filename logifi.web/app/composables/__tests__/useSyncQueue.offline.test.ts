import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkOnlineStatus = vi.fn(async () => undefined)
const resetSyncProgress = vi.fn()
const updateSyncProgress = vi.fn()
const offlineState = { isOnline: false }

vi.mock('../useOffline', () => ({
  useOffline: () => ({
    get isOnline() {
      return { value: offlineState.isOnline }
    },
    checkOnlineStatus,
    resetSyncProgress,
    updateSyncProgress,
  }),
}))

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
    from: vi.fn(),
  },
}))

vi.mock('~/utils/indexedDB', () => ({
  addToSyncQueue: vi.fn(),
  getSyncQueue: vi.fn(async () => []),
  removeFromSyncQueue: vi.fn(),
  updateSyncQueueEntry: vi.fn(),
  getSyncQueueLength: vi.fn(async () => 0),
  markEntryAsSynced: vi.fn(),
  updateEntryInIndexedDB: vi.fn(),
}))

vi.mock('~/utils/logEntryInboundSync', () => ({
  insertLogEntryTombstone: vi.fn(),
}))

describe('useSyncQueue online gating', () => {
  beforeEach(() => {
    offlineState.isOnline = false
    checkOnlineStatus.mockClear()
    resetSyncProgress.mockClear()
    vi.resetModules()
  })

  it('does not process the queue when cloud is offline even if caller asks to sync', async () => {
    const { useSyncQueue } = await import('../useSyncQueue')
    const { processQueue, setActiveUserId } = useSyncQueue()
    setActiveUserId('user-1')

    await processQueue({ silent: true })

    expect(checkOnlineStatus).toHaveBeenCalled()
    expect(resetSyncProgress).toHaveBeenCalled()
  })

  it('checks online status before draining on open', async () => {
    const { useSyncQueue } = await import('../useSyncQueue')
    const { startBackgroundSync, setActiveUserId } = useSyncQueue()
    setActiveUserId('user-1')

    startBackgroundSync()
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))

    expect(checkOnlineStatus).toHaveBeenCalled()
  })
})
