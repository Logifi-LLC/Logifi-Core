import { describe, expect, it, vi, beforeEach } from 'vitest'
import { assertCanScanSpread, consumeCreditForSpread } from '../creditsBalance'

type MockService = {
  from: ReturnType<typeof vi.fn>
  credits: number
  spreadChargeExists: boolean
}

function createSpreadEligibilityService(
  initial: { credits?: number; spreadChargeExists?: boolean } = {}
): MockService {
  const state = {
    credits: initial.credits ?? 0,
    spreadChargeExists: initial.spreadChargeExists ?? false,
  }

  const service = {
    get credits() {
      return state.credits
    },
    from: vi.fn((table: string) => {
      if (table === 'digifi_spread_charges') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: state.spreadChargeExists ? { id: 'charge-1' } : null,
                  error: null,
                })),
              })),
            })),
          })),
        }
      }

      if (table === 'user_profiles') {
        return {
          upsert: vi.fn(async () => ({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { credits: state.credits }, error: null })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return service as MockService
}

function createConsumeSpreadService(initial: { credits?: number } = {}) {
  const state = {
    credits: initial.credits ?? 5,
    spreadCharges: new Set<string>(),
    transactions: [] as Array<Record<string, unknown>>,
    onChargeInsert: null as null | (() => void),
  }

  const service = {
    rpc: vi.fn(async (name: string, args: { p_delta: number }) => {
      if (name !== 'service_increment_user_credits') throw new Error(`Unexpected rpc ${name}`)
      if (state.credits + args.p_delta < 0) {
        return { data: null, error: { message: 'Insufficient credits or user profile missing' } }
      }
      state.credits += args.p_delta
      return { data: state.credits, error: null }
    }),
    from: vi.fn((table: string) => {
      if (table === 'digifi_spread_charges') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn((_col: string, spread: string) => ({
                maybeSingle: vi.fn(async () => ({
                  data: state.spreadCharges.has(spread) ? { id: 'charge-1' } : null,
                  error: null,
                })),
              })),
            })),
          })),
          insert: vi.fn(async (row: { spread_id: string }) => {
            if (state.spreadCharges.has(row.spread_id)) {
              return { error: { code: '23505', message: 'duplicate key' } }
            }
            state.spreadCharges.add(row.spread_id)
            state.onChargeInsert?.()
            return { error: null }
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async (_col: string, spread: string) => {
                state.spreadCharges.delete(spread)
                return { error: null }
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(async () => ({ error: null })),
              })),
            })),
          })),
        }
      }

      if (table === 'user_profiles') {
        return {
          upsert: vi.fn(async () => ({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { credits: state.credits }, error: null })),
            })),
          })),
        }
      }

      if (table === 'credit_transactions') {
        return {
          insert: vi.fn(async (row: Record<string, unknown>) => {
            state.transactions.push(row)
            return { error: null }
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { service, state }
}

describe('consumeCreditForSpread', () => {
  const spreadId = '550e8400-e29b-41d4-a716-446655440000'

  it('charges once per spreadId across two-page left then right billing calls', async () => {
    const { service, state } = createConsumeSpreadService({ credits: 4 })

    const left = await consumeCreditForSpread(service as never, 'user-1', {
      spreadId,
      layout: 'two-page',
    })
    expect(left).toEqual({ ok: true, charged: true, balance: 3 })

    const right = await consumeCreditForSpread(service as never, 'user-1', {
      spreadId,
      layout: 'two-page',
    })
    expect(right).toEqual({ ok: true, charged: false, balance: 3 })
    expect(state.credits).toBe(3)
    expect(state.transactions).toHaveLength(1)
  })

  it('does not overwrite a purchase that lands while the scan is being charged', async () => {
    const { service, state } = createConsumeSpreadService({ credits: 5 })
    state.onChargeInsert = () => {
      state.credits += 10
    }

    const result = await consumeCreditForSpread(service as never, 'user-1', {
      spreadId,
      layout: 'single',
    })

    expect(result).toEqual({ ok: true, charged: true, balance: 14 })
    expect(state.credits).toBe(14)
    expect(state.transactions[0]).toMatchObject({ amount: -1, balance_after: 14 })
  })

  it('charges only one of two concurrent scans when one credit is left', async () => {
    const { service, state } = createConsumeSpreadService({ credits: 1 })

    const results = await Promise.all([
      consumeCreditForSpread(service as never, 'user-1', { spreadId, layout: 'single' }),
      consumeCreditForSpread(service as never, 'user-1', {
        spreadId: '550e8400-e29b-41d4-a716-446655440001',
        layout: 'single',
      }),
    ])

    expect(results.filter((r) => r.charged)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)).toHaveLength(1)
    expect(state.credits).toBe(0)
    expect(state.spreadCharges.size).toBe(1)
  })
})

describe('assertCanScanSpread', () => {
  it('allows rescans when spread is already charged', async () => {
    const service = createSpreadEligibilityService({ credits: 0, spreadChargeExists: true })

    await expect(
      assertCanScanSpread(service as never, 'user-1', '550e8400-e29b-41d4-a716-446655440000')
    ).resolves.toEqual({
      allowed: true,
      willCharge: false,
      balance: 0,
    })
  })

  it('allows first scan when user has credits', async () => {
    const service = createSpreadEligibilityService({ credits: 3, spreadChargeExists: false })

    await expect(
      assertCanScanSpread(service as never, 'user-1', '550e8400-e29b-41d4-a716-446655440000')
    ).resolves.toEqual({
      allowed: true,
      willCharge: true,
      balance: 3,
    })
  })

  it('blocks first scan when user has no credits', async () => {
    const service = createSpreadEligibilityService({ credits: 0, spreadChargeExists: false })

    await expect(
      assertCanScanSpread(service as never, 'user-1', '550e8400-e29b-41d4-a716-446655440000')
    ).resolves.toEqual({
      allowed: false,
      willCharge: false,
      balance: 0,
    })
  })
})
