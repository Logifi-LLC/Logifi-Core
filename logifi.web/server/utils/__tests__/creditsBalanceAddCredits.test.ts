import { describe, expect, it, vi } from 'vitest'
import { addCredits } from '../creditsBalance'
import { CreditReferenceDuplicateError } from '../creditsReference'

describe('addCredits', () => {
  it('uses atomic RPC increment and records the ledger row', async () => {
    const rpc = vi.fn(async () => ({ data: 42, error: null }))
    const insert = vi.fn(async () => ({ error: null }))
    const service = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            upsert: vi.fn(async () => ({ error: null })),
          }
        }
        if (table === 'credit_transactions') {
          return { insert }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    const balance = await addCredits(service as never, 'user-1', 5, {
      referenceId: 'stripe:cs_1',
      paymentMethod: 'stripe',
    })

    expect(balance).toBe(42)
    expect(rpc).toHaveBeenCalledWith('service_increment_user_credits', {
      p_user_id: 'user-1',
      p_delta: 5,
    })
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        amount: 5,
        balance_after: 42,
        reference_id: 'stripe:cs_1',
      })
    )
  })

  it('rolls back balance and throws when reference_id collides', async () => {
    const rpc = vi.fn(async (_fn: string, args: { p_delta: number }) => ({
      data: args.p_delta > 0 ? 50 : 45,
      error: null,
    }))
    const service = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            upsert: vi.fn(async () => ({ error: null })),
          }
        }
        if (table === 'credit_transactions') {
          return {
            insert: vi.fn(async () => ({ error: { code: '23505', message: 'duplicate' } })),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    await expect(
      addCredits(service as never, 'user-1', 5, { referenceId: 'apple:txn-1' })
    ).rejects.toBeInstanceOf(CreditReferenceDuplicateError)

    expect(rpc).toHaveBeenNthCalledWith(2, 'service_increment_user_credits', {
      p_user_id: 'user-1',
      p_delta: -5,
    })
  })
})
