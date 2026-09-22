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
    spreadChargeExists: false,
    transactions: [] as Array<Record<string, unknown>>,
  }

  const service = {
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
          insert: vi.fn(async () => {
            state.spreadChargeExists = true
            return { error: null }
          }),
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
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => {
                  state.credits -= 1
                  return { data: { credits: state.credits }, error: null }
                }),
              })),
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
