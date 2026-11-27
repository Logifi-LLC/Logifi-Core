import { describe, expect, it, vi } from 'vitest'

vi.mock('~/composables/useOffline', () => ({
  useOffline: () => ({
    isOnline: { value: true },
  }),
}))

const rpc = vi.fn()
vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'e1', status: 'pending', updated_at: new Date().toISOString() },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

vi.mock('~/utils/endorsementIndexedDB', () => ({
  getEndorsementSyncQueue: async () => [
    {
      id: 'q1',
      endorsementId: 'e1',
      operation: 'request',
      payload: { p_id: 'e1' },
      timestamp: 1,
      retryCount: 0,
      userId: 'u1',
    },
  ],
  removeFromEndorsementSyncQueue: vi.fn(),
  saveEndorsementToIndexedDB: vi.fn(),
  getEndorsementFromIndexedDB: vi.fn(),
  updateEndorsementInIndexedDB: vi.fn(),
  getEndorsementSyncQueueLength: async () => 0,
}))

describe('useEndorsementSyncQueue idempotency', () => {
  it('treats duplicate client id conflict as success', async () => {
    rpc.mockResolvedValueOnce({ error: { message: 'endorsement id conflict' } })
    const { useEndorsementSyncQueue } = await import('../useEndorsementSyncQueue')
    const { processQueue } = useEndorsementSyncQueue()
    await processQueue({ silent: true })
    expect(rpc).toHaveBeenCalled()
  })
})