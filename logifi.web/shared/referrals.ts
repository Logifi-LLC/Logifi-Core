/** Digifi credits for the referred account, after attribution and email verification. */
export const FRIEND_REFERRAL_CREDITS = 5

/** Digifi credits for the referrer on the friend's first Stripe or Apple IAP purchase. */
export const REFERRER_REWARD_CREDITS = 10

/** Rewarded referrals (referrer bonuses) per account. Keep in sync with the cap trigger. */
export const REFERRER_REWARD_CAP = 10

export const REFERRAL_CODE_LENGTH = 8

/** No 0/O/1/I/L so a code can be read aloud. */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const REFERRAL_SHARE_ORIGIN = 'https://www.logifi.io'

export const REFERRAL_STORAGE_KEY = 'logifi_ref'

export const REFERRAL_PROMPT_DISMISSED_KEY = 'logifi.invitePromptDismissed'

const CODE_PATTERN = new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`)

export type AttributionBlock =
  | 'invalid_code'
  | 'unknown_code'
  | 'self'
  | 'already_referred'
  | 'paid_purchase'

export type ReferralRewardKind = 'friend_bonus' | 'referrer_bonus'

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase().replace(/[\s-]/g, '')
  return CODE_PATTERN.test(code) ? code : null
}

/**
 * Public share link. Pass the page origin for web (preview, localhost, or www).
 * Omit it for the production site, which is also what the native app shares
 * (the WebView origin is not a public URL).
 */
export function referralShareUrl(code: string, origin?: string | null): string {
  const base = httpOrigin(origin) ?? REFERRAL_SHARE_ORIGIN
  return `${base}/?ref=${encodeURIComponent(code)}`
}

function httpOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export function friendRewardReferenceId(userId: string): string {
  return `referral:friend:${userId}`
}

export function referrerRewardReferenceId(referredUserId: string): string {
  return `referral:referrer:${referredUserId}`
}

export function decideAttribution(input: {
  normalizedCode: string | null
  codeOwnerId: string | null
  userId: string
  referredBy: string | null
  hasPaidPurchase: boolean
}):
  | { ok: true; already: boolean; referrerId: string }
  | { ok: false; reason: AttributionBlock } {
  if (!input.normalizedCode) return { ok: false, reason: 'invalid_code' }
  if (!input.codeOwnerId) return { ok: false, reason: 'unknown_code' }
  if (input.codeOwnerId === input.userId) return { ok: false, reason: 'self' }
  if (input.referredBy) {
    if (input.referredBy === input.codeOwnerId) {
      return { ok: true, already: true, referrerId: input.referredBy }
    }
    return { ok: false, reason: 'already_referred' }
  }
  if (input.hasPaidPurchase) return { ok: false, reason: 'paid_purchase' }
  return { ok: true, already: false, referrerId: input.codeOwnerId }
}

/** Friend bonus is once, only after the account is attributed and the email is verified. */
export function decideFriendGrant(input: {
  referredBy: string | null
  emailVerified: boolean
  alreadyGranted: boolean
}): boolean {
  return Boolean(input.referredBy) && input.emailVerified && !input.alreadyGranted
}

/**
 * Referrer bonus is the friend's first paid credit purchase, and only when that
 * purchase is Stripe or Apple IAP. Refunds are not a payment method here.
 */
export function decideReferrerGrant(input: {
  referredBy: string | null
  paymentMethod: string
  isFirstPaidPurchase: boolean
  rewardedCount: number
  alreadyGranted: boolean
}): boolean {
  if (!input.referredBy) return false
  if (input.paymentMethod !== 'stripe' && input.paymentMethod !== 'apple_iap') return false
  if (!input.isFirstPaidPurchase) return false
  if (input.alreadyGranted) return false
  if (input.rewardedCount >= REFERRER_REWARD_CAP) return false
  return true
}

export function isFirstPaidPurchaseCount(purchaseCount: number): boolean {
  return purchaseCount === 1
}
