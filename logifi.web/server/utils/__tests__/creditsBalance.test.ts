import { describe, expect, it, vi } from 'vitest'
import {
  grantWelcomeCredits,
  hasWelcomeCreditsGrant,
  reconcileCreditsBalanceFromLedger,
} from '../creditsBalance'
import { WELCOME_CREDITS, welcomeCreditsReferenceId } from '../../../shared/creditsWelcome'

type MockService = {
  from: ReturnType<typeof vi.fn>
  credits: number
  welcomeGrantExists: boolean
  insertedTransactions: Array<Record<string, unknown>>
}

function createMockService(initial: { credits?: number; welcomeGrantExists?: boolean } = {}): MockService {
  const state = {
    credits: initial.credits ?? 0,
    welcomeGrantExists: initial.welcomeGrantExists ?? false,
    insertedTransactions: [] as Array<Record<string, unknown>>,
  }

  const service = {
    get credits() {
      return state.credits
    },
    get welcomeGrantExists() {
      return state.welcomeGrantExists
    },
    get insertedTransactions() {
      return state.insertedTransactions
    },
    from: vi.fn((table: string) => {
      if (table === 'credit_transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => ({
              maybeSingle: vi.fn(async () => ({
                data: state.welcomeGrantExists && value.startsWith('welcome:') ? { id: 'tx-welcome' } : null,
                error: null,
              })),
            })),
          })),
          insert: vi.fn(async (row: Record<string, unknown>) => {
            state.insertedTransactions.push(row)
            if (row.reference_id && String(row.reference_id).startsWith('welcome:')) {
              state.welcomeGrantExists = true
            }
            return { error: null }
          }),
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
                  state.credits += WELCOME_CREDITS
                  return { data: { credits: state.credits }, error: null }
                }),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return service as MockService
}

describe('hasWelcomeCreditsGrant', () => {
  it('returns true when welcome reference exists', async () => {
    const service = createMockService({ welcomeGrantExists: true })
    await expect(hasWelcomeCreditsGrant(service as never, 'user-1')).resolves.toBe(true)
  })

  it('returns false when welcome reference is missing', async () => {
    const service = createMockService({ welcomeGrantExists: false })
    await expect(hasWelcomeCreditsGrant(service as never, 'user-1')).resolves.toBe(false)
  })
})

describe('grantWelcomeCredits', () => {
  it('grants welcome credits once', async () => {
    const service = createMockService({ credits: 0, welcomeGrantExists: false })

    const result = await grantWelcomeCredits(service as never, 'user-1')

    expect(result.granted).toBe(true)
    expect(result.credits).toBe(WELCOME_CREDITS)
    expect(service.insertedTransactions).toHaveLength(1)
    expect(service.insertedTransactions[0]).toMatchObject({
      type: 'admin',
      amount: WELCOME_CREDITS,
      reference_id: welcomeCreditsReferenceId('user-1'),
    })
  })

  it('does not grant welcome credits twice', async () => {
    const service = createMockService({ credits: WELCOME_CREDITS, welcomeGrantExists: true })

    const result = await grantWelcomeCredits(service as never, 'user-1')

    expect(result.granted).toBe(false)
    expect(result.credits).toBe(WELCOME_CREDITS)
    expect(service.insertedTransactions).toHaveLength(0)
  })
})

describe('reconcileCreditsBalanceFromLedger', () => {
  it('syncs profile credits to latest ledger balance_after', async () => {
    const state = { credits: 0, ledgerBalance: 10 }
    const service = {
      from: vi.fn((table: string) => {
        if (table === 'credit_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: { balance_after: state.ledgerBalance },
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { credits: state.credits }, error: null })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => {
                    state.credits = state.ledgerBalance
                    return { data: { credits: state.credits }, error: null }
                  }),
                })),
              })),
            })),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    await expect(reconcileCreditsBalanceFromLedger(service as never, 'user-1')).resolves.toBe(10)
    expect(state.credits).toBe(10)
  })
})
