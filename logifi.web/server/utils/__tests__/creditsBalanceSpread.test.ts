import { describe, expect, it, vi, beforeEach } from 'vitest'
import { assertCanScanSpread } from '../creditsBalance'

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
