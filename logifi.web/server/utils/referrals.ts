import { randomInt } from 'node:crypto'
import type { H3Event } from 'h3'
import { getSupabaseClient } from './supabase'
import { addCredits } from './creditsBalance'
import {
  FRIEND_REFERRAL_CREDITS,
  REFERRER_REWARD_CAP,
  REFERRER_REWARD_CREDITS,
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  decideAttribution,
  decideFriendGrant,
  decideReferrerGrant,
  friendRewardReferenceId,
  isFirstPaidPurchaseCount,
  normalizeReferralCode,
  referralShareUrl,
  referrerRewardReferenceId,
  type AttributionBlock,
  type ReferralRewardKind,
} from '../../shared/referrals'
import {
  createSupabaseReferralStore,
  type ReferralStore,
  type ServiceClient,
} from './referralStore'

const FRIEND_DESCRIPTION = `Referral bonus — ${FRIEND_REFERRAL_CREDITS} Digifi credits`
const REFERRER_DESCRIPTION = `Referral reward — ${REFERRER_REWARD_CREDITS} Digifi credits`

export interface CreditGranter {
  grant(userId: string, amount: number, referenceId: string, description: string): Promise<void>
}

export interface ReferralClaimResult {
  ok: boolean
  attributed: boolean
  friendCreditsGranted: boolean
  reason?: AttributionBlock
}

export interface ReferralStatus {
  code: string
  shareUrl: string
  rewardedCount: number
  rewardCap: number
  referred: boolean
  canEnterCode: boolean
}

export function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)]
  }
  return code
}

export function creditsGranter(service: ServiceClient): CreditGranter {
  return {
    async grant(userId, amount, referenceId, description) {
      const { data, error } = await service
        .from('credit_transactions')
        .select('id')
        .eq('reference_id', referenceId)
        .maybeSingle()
      if (error) throw error
      if (data) return
      await addCredits(service, userId, amount, {
        type: 'admin',
        referenceId,
        description,
      })
    },
  }
}

export async function readAuthUser(event: H3Event) {
  const supabase = getSupabaseClient(event)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function ensureReferralCode(store: ReferralStore, userId: string): Promise<string> {
  const existing = await store.getCode(userId)
  if (existing) return existing

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode()
    const saved = await store.saveCode(userId, code)
    if (saved === 'ok') return code
    const raced = await store.getCode(userId)
    if (raced) return raced
  }

  throw new Error('Could not create referral code')
}

async function grantKindOnce(
  store: ReferralStore,
  granter: CreditGranter,
  input: {
    referrerId: string
    referredUserId: string
    kind: ReferralRewardKind
    credits: number
    beneficiaryId: string
    referenceId: string
    description: string
  }
): Promise<boolean> {
  if (await store.hasReward(input.referredUserId, input.kind)) return false
  const claimed = await store.claimReward({
    referrerId: input.referrerId,
    referredUserId: input.referredUserId,
    kind: input.kind,
    credits: input.credits,
  })
  if (claimed !== 'ok') return false

  try {
    await granter.grant(input.beneficiaryId, input.credits, input.referenceId, input.description)
  } catch (error) {
    await store.releaseReward(input.referredUserId, input.kind)
    throw error
  }
  return true
}

async function maybeGrantFriend(
  store: ReferralStore,
  granter: CreditGranter,
  userId: string,
  referredBy: string | null,
  emailVerified: boolean
): Promise<boolean> {
  const alreadyGranted = referredBy ? await store.hasReward(userId, 'friend_bonus') : false
  if (!decideFriendGrant({ referredBy, emailVerified, alreadyGranted })) return false
  return grantKindOnce(store, granter, {
    referrerId: referredBy as string,
    referredUserId: userId,
    kind: 'friend_bonus',
    credits: FRIEND_REFERRAL_CREDITS,
    beneficiaryId: userId,
    referenceId: friendRewardReferenceId(userId),
    description: FRIEND_DESCRIPTION,
  })
}

export async function attributeReferral(
  store: ReferralStore,
  granter: CreditGranter,
  userId: string,
  rawCode: string,
  emailVerified: boolean
): Promise<ReferralClaimResult> {
  const normalizedCode = normalizeReferralCode(rawCode)
  const codeOwnerId = normalizedCode ? await store.findUserIdByCode(normalizedCode) : null
  const referredBy = await store.getReferredBy(userId)
  const hasPaidPurchase = referredBy ? false : await store.hasPaidPurchase(userId)
  const decision = decideAttribution({
    normalizedCode,
    codeOwnerId,
    userId,
    referredBy,
    hasPaidPurchase,
  })

  if (!decision.ok) {
    return {
      ok: false,
      reason: decision.reason,
      attributed: Boolean(referredBy),
      friendCreditsGranted: false,
    }
  }

  if (!decision.already) {
    const saved = await store.setReferredBy(userId, decision.referrerId)
    if (saved === 'conflict') {
      const current = await store.getReferredBy(userId)
      if (current !== decision.referrerId) {
        return {
          ok: false,
          reason: 'already_referred',
          attributed: Boolean(current),
          friendCreditsGranted: false,
        }
      }
    }
  }

  const friendCreditsGranted = await maybeGrantFriend(
    store,
    granter,
    userId,
    decision.referrerId,
    emailVerified
  )
  return { ok: true, attributed: true, friendCreditsGranted }
}

export async function claimReferral(
  store: ReferralStore,
  granter: CreditGranter,
  userId: string,
  rawCode: string | null,
  emailVerified: boolean
): Promise<ReferralClaimResult> {
  await ensureReferralCode(store, userId)
  if (rawCode && rawCode.trim()) {
    return attributeReferral(store, granter, userId, rawCode, emailVerified)
  }
  const referredBy = await store.getReferredBy(userId)
  const friendCreditsGranted = await maybeGrantFriend(
    store,
    granter,
    userId,
    referredBy,
    emailVerified
  )
  return { ok: true, attributed: Boolean(referredBy), friendCreditsGranted }
}

/**
 * Call after a new paid credit grant. Stripe and Apple IAP only.
 * A later refund does not remove the referrer credits.
 */
export async function applyReferrerReward(
  store: ReferralStore,
  granter: CreditGranter,
  userId: string,
  paymentMethod: string
): Promise<{ granted: boolean }> {
  const referredBy = await store.getReferredBy(userId)
  const purchaseCount = await store.paidPurchaseCount(userId)
  const alreadyGranted = referredBy ? await store.hasReward(userId, 'referrer_bonus') : false
  const rewardedCount = referredBy ? await store.referrerRewardCount(referredBy) : 0
  if (
    !decideReferrerGrant({
      referredBy,
      paymentMethod,
      isFirstPaidPurchase: isFirstPaidPurchaseCount(purchaseCount),
      rewardedCount,
      alreadyGranted,
    })
  ) {
    return { granted: false }
  }

  const granted = await grantKindOnce(store, granter, {
    referrerId: referredBy as string,
    referredUserId: userId,
    kind: 'referrer_bonus',
    credits: REFERRER_REWARD_CREDITS,
    beneficiaryId: referredBy as string,
    referenceId: referrerRewardReferenceId(userId),
    description: REFERRER_DESCRIPTION,
  })
  return { granted }
}

export function authEmailVerified(user: {
  email_confirmed_at?: string | null
  confirmed_at?: string | null
}): boolean {
  return Boolean(user.email_confirmed_at || user.confirmed_at)
}

export async function getReferralStatus(
  store: ReferralStore,
  userId: string,
  shareOrigin?: string | null
): Promise<ReferralStatus> {
  const code = await ensureReferralCode(store, userId)
  const referredBy = await store.getReferredBy(userId)
  const hasPaidPurchase = await store.hasPaidPurchase(userId)
  const rewardedCount = await store.referrerRewardCount(userId)
  return {
    code,
    shareUrl: referralShareUrl(code, shareOrigin),
    rewardedCount,
    rewardCap: REFERRER_REWARD_CAP,
    referred: Boolean(referredBy),
    canEnterCode: !referredBy && !hasPaidPurchase,
  }
}

export async function claimReferralForUser(
  service: ServiceClient,
  userId: string,
  rawCode: string | null,
  emailVerified: boolean
): Promise<ReferralClaimResult> {
  const store = createSupabaseReferralStore(service)
  return claimReferral(store, creditsGranter(service), userId, rawCode, emailVerified)
}

export async function getReferralStatusForUser(
  service: ServiceClient,
  userId: string,
  shareOrigin?: string | null
): Promise<ReferralStatus> {
  return getReferralStatus(createSupabaseReferralStore(service), userId, shareOrigin)
}

export async function rewardReferrerForPaidPurchase(
  service: ServiceClient,
  userId: string,
  paymentMethod: string
): Promise<{ granted: boolean }> {
  return applyReferrerReward(
    createSupabaseReferralStore(service),
    creditsGranter(service),
    userId,
    paymentMethod
  )
}
