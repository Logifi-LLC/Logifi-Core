import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import handler from '../webhook/stripe.post'
import * as creditsPaymentUtils from '../../../utils/creditsPayment'
import * as referralUtils from '../../../utils/referrals'

const { constructEvent } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
}))

vi.mock('../../../utils/stripeClient', () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent },
  }),
}))

vi.mock('../../../utils/stripeEnv', () => ({
  getStripeEnv: () => ({ webhookSecret: 'whsec_test' }),
}))

vi.mock('../../../utils/supabaseService', () => ({
  getSupabaseServiceClient: () => ({ role: 'service' }),
}))

vi.mock('../../../utils/creditsPayment', () => ({
  grantCreditsIdempotent: vi.fn(),
}))

vi.mock('../../../utils/referrals', () => ({
  rewardReferrerForPaidPurchase: vi.fn(async () => ({ granted: true })),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getHeader: () => 'sig',
    readRawBody: async () => 'raw',
    createError: (opts: { statusCode: number; statusMessage: string }) => {
      const error = new Error(opts.statusMessage) as Error & { statusCode: number }
      error.statusCode = opts.statusCode
      return error
    },
  }
})

describe('POST /api/credits/webhook/stripe referral hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          metadata: { userId: 'buyer', numberOfCredits: '25', purpose: 'digifi_credits' },
        },
      },
    })
  })

  it('rewards the referrer when a Stripe credit purchase is newly granted', async () => {
    vi.mocked(creditsPaymentUtils.grantCreditsIdempotent).mockResolvedValue({
      credits: 35,
      granted: true,
    })

    await handler({} as H3Event)

    expect(referralUtils.rewardReferrerForPaidPurchase).toHaveBeenCalledWith(
      { role: 'service' },
      'buyer',
      'stripe'
    )
  })

  it('does not reward the referrer when the Stripe purchase was already granted', async () => {
    vi.mocked(creditsPaymentUtils.grantCreditsIdempotent).mockResolvedValue({
      credits: 35,
      granted: false,
    })

    await handler({} as H3Event)

    expect(referralUtils.rewardReferrerForPaidPurchase).not.toHaveBeenCalled()
  })
})
