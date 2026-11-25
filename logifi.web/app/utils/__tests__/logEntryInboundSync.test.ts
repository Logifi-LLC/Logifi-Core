import { describe, expect, it, vi } from 'vitest'

const upsert = vi.fn(async () => ({ error: null }))
const from = vi.fn(() => ({ upsert }))

vi.mock('~/lib/supabase', () => ({
  supabase: { from },
}))

describe('insertLogEntryTombstone', () => {
  it('lets the server stamp deleted_at instead of the device clock', async () => {
    const { insertLogEntryTombstone } = await import('../logEntryInboundSync')

    await insertLogEntryTombstone('user-1', '00000000-0000-4000-8000-000000000001')

    expect(from).toHaveBeenCalledWith('log_entry_deletions')
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', entry_id: '00000000-0000-4000-8000-000000000001' },
      { onConflict: 'user_id,entry_id' }
    )
  })
})
