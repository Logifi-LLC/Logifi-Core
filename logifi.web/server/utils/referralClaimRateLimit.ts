const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 10

type Bucket = { count: number; windowStartMs: number }

const buckets = new Map<string, Bucket>()

export function referralClaimRateLimitExceeded(userId: string, nowMs = Date.now()): boolean {
  const bucket = buckets.get(userId)
  if (!bucket || nowMs - bucket.windowStartMs >= WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStartMs: nowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > MAX_ATTEMPTS
}

/** @internal */
export function clearReferralClaimRateLimitForTests(): void {
  buckets.clear()
}
