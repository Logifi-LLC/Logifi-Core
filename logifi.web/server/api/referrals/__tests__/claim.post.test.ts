import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import handler from '../claim.post'
import * as referralsUtils from '../../../utils/referrals'
import * as supabaseServiceUtils from '../../../utils/supabaseService'
import { clearReferralClaimRateLimitForTests } from '../../../utils/referralClaimRateLimit'

vi.mock('../../../utils/referrals', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/referrals')>(
    '../../../utils/referrals'
  )
  return {
    ...actual,
    readAuthUser: vi.fn(),
    claimReferralForUser: vi.fn(),
  }
})

vi.mock('../../../utils/supabaseService')

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: vi.fn(async () => ({ code: 'ABCD234H' })),
    createError: (opts: { statusCode: number; statusMessage: string }) => {
      const error = new Error(opts.statusMessage) as Error & { statusCode: number }
      error.statusCode = opts.statusCode
      return error
    },
  }
})

describe('POST /api/referrals/claim', () => {
  const event = {} as H3Event

  beforeEach(() => {
    vi.clearAllMocks()
    clearReferralClaimRateLimitForTests()
    vi.mocked(supabaseServiceUtils.getSupabaseServiceClient).mockReturnValue({} as never)
    vi.mocked(referralsUtils.readAuthUser).mockResolvedValue({
      id: 'user-claim',
      email_confirmed_at: '2024-01-01T00:00:00Z',
    } as never)
  })

  it('masks unknown codes as invalid_code', async () => {
    vi.mocked(referralsUtils.claimReferralForUser).mockResolvedValue({
      ok: false,
      attributed: false,
      friendCreditsGranted: false,
      reason: 'unknown_code',
    })

    const result = await handler(event)
    expect(result.reason).toBe('invalid_code')
  })

  it('returns invalid_code when rate limited', async () => {
    vi.mocked(referralsUtils.claimReferralForUser).mockResolvedValue({
      ok: true,
      attributed: false,
      friendCreditsGranted: false,
    })

    for (let i = 0; i < 10; i += 1) {
      await handler(event)
    }
    const limited = await handler(event)
    expect(limited).toMatchObject({
      ok: false,
      reason: 'invalid_code',
      friendCreditsGranted: false,
    })
    expect(referralsUtils.claimReferralForUser).toHaveBeenCalledTimes(10)
  })
})
