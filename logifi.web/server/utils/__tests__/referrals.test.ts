import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FRIEND_REFERRAL_CREDITS,
  REFERRER_REWARD_CAP,
  REFERRER_REWARD_CREDITS,
  decideAttribution,
  decideFriendGrant,
  decideReferrerGrant,
  normalizeReferralCode,
  referralShareUrl,
  type ReferralRewardKind,
} from '../../../shared/referrals'
import type { CreditGranter } from '../referrals'
import {
  applyReferrerReward,
  attributeReferral,
  claimReferral,
  creditsGranter,
} from '../referrals'
import type { ReferralStore } from '../referralStore'
import { addCredits } from '../creditsBalance'

vi.mock('../creditsBalance', () => ({
  addCredits: vi.fn(async () => 15),
}))

function memoryStore() {
  const codes = new Map<string, string>()
  const owners = new Map<string, string>()
  const referredBy = new Map<string, string>()
  const purchases = new Map<string, number>()
  const rewards: {
    referrerId: string
    referredUserId: string
    kind: ReferralRewardKind
    credits: number
  }[] = []

  const store: ReferralStore = {
    async getCode(userId) {
      return codes.get(userId) ?? null
    },
    async saveCode(userId, code) {
      if (codes.has(userId) || owners.has(code)) return 'conflict'
      codes.set(userId, code)
      owners.set(code, userId)
      return 'ok'
    },
    async findUserIdByCode(code) {
      return owners.get(code) ?? null
    },
    async getReferredBy(userId) {
      return referredBy.get(userId) ?? null
    },
    async setReferredBy(userId, referrerId) {
      if (referredBy.has(userId)) return 'conflict'
      referredBy.set(userId, referrerId)
      return 'ok'
    },
    async hasPaidPurchase(userId) {
      return (purchases.get(userId) ?? 0) > 0
    },
    async paidPurchaseCount(userId) {
      return purchases.get(userId) ?? 0
    },
    async referrerRewardCount(referrerId) {
      return rewards.filter((row) => row.referrerId === referrerId && row.kind === 'referrer_bonus').length
    },
    async hasReward(referredUserId, kind) {
      return rewards.some((row) => row.referredUserId === referredUserId && row.kind === kind)
    },
    async claimReward(input) {
      if (rewards.some((row) => row.referredUserId === input.referredUserId && row.kind === input.kind)) {
        return 'duplicate'
      }
      if (input.kind === 'referrer_bonus') {
        const count = rewards.filter(
          (row) => row.referrerId === input.referrerId && row.kind === 'referrer_bonus'
        ).length
        if (count >= REFERRER_REWARD_CAP) return 'cap'
      }
      rewards.push(input)
      return 'ok'
    },
    async releaseReward(referredUserId, kind) {
      const index = rewards.findIndex(
        (row) => row.referredUserId === referredUserId && row.kind === kind
      )
      if (index >= 0) rewards.splice(index, 1)
    },
  }

  return { store, codes, owners, referredBy, purchases, rewards }
}

function granter() {
  const grants: { userId: string; amount: number; referenceId: string }[] = []
  const creditGranter: CreditGranter = {
    async grant(userId, amount, referenceId) {
      grants.push({ userId, amount, referenceId })
    },
  }
  return { creditGranter, grants }
}

describe('referral code rules', () => {
  it('normalizes a spoken code and rejects ambiguous characters', () => {
    expect(normalizeReferralCode(' abcd-234h ')).toBe('ABCD234H')
    expect(normalizeReferralCode('OOOOOOOO')).toBeNull()
    expect(normalizeReferralCode('ABC')).toBeNull()
  })

  it('builds a permanent share link', () => {
    expect(referralShareUrl('ABCD234H')).toBe('https://www.logifi.io/?ref=ABCD234H')
  })

  it('blocks self-referral, a second referrer, and a code after a paid purchase', () => {
    expect(
      decideAttribution({
        normalizedCode: 'ABCD234H',
        codeOwnerId: 'me',
        userId: 'me',
        referredBy: null,
        hasPaidPurchase: false,
      })
    ).toEqual({ ok: false, reason: 'self' })

    expect(
      decideAttribution({
        normalizedCode: 'ABCD234H',
        codeOwnerId: 'other',
        userId: 'me',
        referredBy: 'first',
        hasPaidPurchase: false,
      })
    ).toEqual({ ok: false, reason: 'already_referred' })

    expect(
      decideAttribution({
        normalizedCode: 'ABCD234H',
        codeOwnerId: 'other',
        userId: 'me',
        referredBy: null,
        hasPaidPurchase: true,
      })
    ).toEqual({ ok: false, reason: 'paid_purchase' })
  })

  it('grants the friend bonus only once the email is verified', () => {
    expect(
      decideFriendGrant({ referredBy: 'ref', emailVerified: false, alreadyGranted: false })
    ).toBe(false)
    expect(
      decideFriendGrant({ referredBy: 'ref', emailVerified: true, alreadyGranted: false })
    ).toBe(true)
    expect(
      decideFriendGrant({ referredBy: 'ref', emailVerified: true, alreadyGranted: true })
    ).toBe(false)
  })

  it('rewards Stripe and Apple IAP first purchases under the cap, and nothing else', () => {
    const base = {
      referredBy: 'ref',
      isFirstPaidPurchase: true,
      rewardedCount: 0,
      alreadyGranted: false,
    }
    expect(decideReferrerGrant({ ...base, paymentMethod: 'stripe' })).toBe(true)
    expect(decideReferrerGrant({ ...base, paymentMethod: 'apple_iap' })).toBe(true)
    expect(decideReferrerGrant({ ...base, paymentMethod: 'lightning' })).toBe(false)
    expect(decideReferrerGrant({ ...base, paymentMethod: 'refund' })).toBe(false)
    expect(decideReferrerGrant({ ...base, paymentMethod: 'stripe', isFirstPaidPurchase: false })).toBe(false)
    expect(
      decideReferrerGrant({ ...base, paymentMethod: 'stripe', rewardedCount: REFERRER_REWARD_CAP })
    ).toBe(false)
  })
})

describe('referral attribution and grants', () => {
  async function seedReferrer(state: ReturnType<typeof memoryStore>) {
    await state.store.saveCode('referrer', 'ABCD234H')
    await state.store.saveCode('other', 'ZZZZ234H')
  }

  it('attributes once, waits for email verification, then grants 5 credits once', async () => {
    const state = memoryStore()
    await seedReferrer(state)
    const credits = granter()

    const pending = await attributeReferral(state.store, credits.creditGranter, 'friend', 'abcd-234h', false)
    expect(pending).toMatchObject({ ok: true, attributed: true, friendCreditsGranted: false })
    expect(state.referredBy.get('friend')).toBe('referrer')
    expect(credits.grants).toHaveLength(0)

    const verified = await claimReferral(state.store, credits.creditGranter, 'friend', null, true)
    expect(verified.friendCreditsGranted).toBe(true)
    expect(credits.grants).toEqual([
      expect.objectContaining({
        userId: 'friend',
        amount: FRIEND_REFERRAL_CREDITS,
        referenceId: 'referral:friend:friend',
      }),
    ])

    const again = await claimReferral(state.store, credits.creditGranter, 'friend', 'ABCD234H', true)
    expect(again.friendCreditsGranted).toBe(false)
    expect(credits.grants).toHaveLength(1)
  })

  it('rejects self-referral, a second referrer, and a code after a paid purchase', async () => {
    const state = memoryStore()
    await seedReferrer(state)
    await state.store.saveCode('friend', 'SELF234H')
    const credits = granter()

    const self = await attributeReferral(state.store, credits.creditGranter, 'friend', 'SELF234H', true)
    expect(self.reason).toBe('self')
    expect(state.referredBy.has('friend')).toBe(false)

    await attributeReferral(state.store, credits.creditGranter, 'friend', 'ABCD234H', true)
    const second = await attributeReferral(state.store, credits.creditGranter, 'friend', 'ZZZZ234H', true)
    expect(second.reason).toBe('already_referred')
    expect(state.referredBy.get('friend')).toBe('referrer')

    state.purchases.set('buyer', 1)
    const late = await attributeReferral(state.store, credits.creditGranter, 'buyer', 'ABCD234H', true)
    expect(late.reason).toBe('paid_purchase')
    expect(state.referredBy.has('buyer')).toBe(false)
    expect(credits.grants.every((row) => row.userId !== 'buyer')).toBe(true)
  })

  it('pays the referrer 10 credits on the first Stripe or Apple purchase, once', async () => {
    const state = memoryStore()
    state.referredBy.set('stripe-friend', 'referrer')
    state.referredBy.set('apple-friend', 'referrer')
    state.referredBy.set('lightning-friend', 'referrer')
    state.purchases.set('stripe-friend', 1)
    state.purchases.set('apple-friend', 1)
    state.purchases.set('lightning-friend', 1)
    const credits = granter()

    const stripe = await applyReferrerReward(state.store, credits.creditGranter, 'stripe-friend', 'stripe')
    const apple = await applyReferrerReward(state.store, credits.creditGranter, 'apple-friend', 'apple_iap')
    const lightning = await applyReferrerReward(
      state.store,
      credits.creditGranter,
      'lightning-friend',
      'lightning'
    )

    expect(stripe.granted).toBe(true)
    expect(apple.granted).toBe(true)
    expect(lightning.granted).toBe(false)
    expect(credits.grants).toEqual([
      expect.objectContaining({
        userId: 'referrer',
        amount: REFERRER_REWARD_CREDITS,
        referenceId: 'referral:referrer:stripe-friend',
      }),
      expect.objectContaining({
        userId: 'referrer',
        amount: REFERRER_REWARD_CREDITS,
        referenceId: 'referral:referrer:apple-friend',
      }),
    ])

    const duplicate = await applyReferrerReward(state.store, credits.creditGranter, 'stripe-friend', 'stripe')
    expect(duplicate.granted).toBe(false)

    state.purchases.set('stripe-friend', 2)
    const repeat = await applyReferrerReward(state.store, credits.creditGranter, 'stripe-friend', 'stripe')
    expect(repeat.granted).toBe(false)
    expect(credits.grants).toHaveLength(2)
  })

  it('stops at 10 rewarded referrals and does not claw a reward back', async () => {
    const state = memoryStore()
    const credits = granter()

    for (let i = 0; i < REFERRER_REWARD_CAP; i += 1) {
      const id = `friend-${i}`
      state.referredBy.set(id, 'referrer')
      state.purchases.set(id, 1)
      const result = await applyReferrerReward(state.store, credits.creditGranter, id, i % 2 === 0 ? 'stripe' : 'apple_iap')
      expect(result.granted).toBe(true)
    }

    state.referredBy.set('friend-extra', 'referrer')
    state.purchases.set('friend-extra', 1)
    const capped = await applyReferrerReward(state.store, credits.creditGranter, 'friend-extra', 'apple_iap')
    expect(capped.granted).toBe(false)
    expect(credits.grants).toHaveLength(REFERRER_REWARD_CAP)

    const again = await applyReferrerReward(state.store, credits.creditGranter, 'friend-0', 'stripe')
    expect(again.granted).toBe(false)
    expect(credits.grants).toHaveLength(REFERRER_REWARD_CAP)
  })
})

describe('creditsGranter', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('writes referral credits through the existing ledger as admin', async () => {
    const service = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }

    await creditsGranter(service as never).grant(
      'friend',
      5,
      'referral:friend:friend',
      'Referral bonus — 5 Digifi credits'
    )

    expect(addCredits).toHaveBeenCalledWith(service, 'friend', 5, {
      type: 'admin',
      referenceId: 'referral:friend:friend',
      description: 'Referral bonus — 5 Digifi credits',
    })
  })

  it('does not write a second ledger row for the same reference', async () => {
    const service = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: 'tx' }, error: null }),
          }),
        }),
      }),
    }

    await creditsGranter(service as never).grant('friend', 5, 'referral:friend:friend', 'Referral bonus')
    expect(addCredits).not.toHaveBeenCalled()
  })
})
