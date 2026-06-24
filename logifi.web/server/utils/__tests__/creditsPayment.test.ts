import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMockCreditsEnabled } from '../creditsMockEnabled'
import { grantCreditsIdempotent, hasPurchaseForReference } from '../creditsPayment'

vi.mock('../creditsBalance', () => ({
  addCredits: vi.fn(async () => 35),
  getCreditsBalance: vi.fn(async () => 35),
}))

import { addCredits, getCreditsBalance } from '../creditsBalance'

describe('isMockCreditsEnabled', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('returns true when NUXT_CREDITS_MOCK_ENABLED=true', () => {
    process.env.NUXT_CREDITS_MOCK_ENABLED = 'true'
    process.env.CREDITS_MOCK_ENABLED = 'false'
    expect(isMockCreditsEnabled()).toBe(true)
  })

  it('returns false when NUXT_CREDITS_MOCK_ENABLED=false', () => {
    process.env.NUXT_CREDITS_MOCK_ENABLED = 'false'
    expect(isMockCreditsEnabled()).toBe(false)
  })
})

function mockServiceWithReference(existing: { id: string } | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: existing, error: null })),
          })),
        })),
      })),
    })),
  }
}

describe('grantCreditsIdempotent', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('skips addCredits when reference already exists', async () => {
    const service = mockServiceWithReference({ id: 'tx-1' })

    const result = await grantCreditsIdempotent(
      service as never,
      'user-1',
      25,
      { referenceId: 'stripe:cs_test_123', paymentMethod: 'stripe' }
    )

    expect(result.granted).toBe(false)
    expect(result.credits).toBe(35)
    expect(getCreditsBalance).toHaveBeenCalled()
    expect(addCredits).not.toHaveBeenCalled()
  })

  it('grants credits when reference is new', async () => {
    const service = mockServiceWithReference(null)

    const result = await grantCreditsIdempotent(
      service as never,
      'user-1',
      10,
      { referenceId: 'stripe:cs_new', paymentMethod: 'stripe' }
    )

    expect(result.granted).toBe(true)
    expect(result.credits).toBe(35)
    expect(addCredits).toHaveBeenCalledWith(
      service,
      'user-1',
      10,
      expect.objectContaining({ referenceId: 'stripe:cs_new', paymentMethod: 'stripe' })
    )
  })
})

describe('hasPurchaseForReference', () => {
  it('returns false when no matching transaction', async () => {
    const service = mockServiceWithReference(null)
    await expect(hasPurchaseForReference(service as never, 'stripe:abc')).resolves.toBe(false)
  })

  it('returns true when purchase exists', async () => {
    const service = mockServiceWithReference({ id: 'tx-1' })
    await expect(hasPurchaseForReference(service as never, 'stripe:abc')).resolves.toBe(true)
  })
})
