const WINDOW_MS = 60 * 60 * 1000
const PER_ENTRY_WINDOW_MS = 10 * 60 * 1000
const MAX_PER_USER_PER_HOUR = 8

type Bucket = { count: number; windowStartMs: number }

const userBuckets = new Map<string, Bucket>()
const entryBuckets = new Map<string, number>()

export function signatureRequestRateLimitExceeded(args: {
  userId: string
  entryId: string
  nowMs?: number
}): 'user' | 'entry' | null {
  const now = args.nowMs ?? Date.now()
  const lastEntry = entryBuckets.get(args.entryId)
  if (lastEntry != null && now - lastEntry < PER_ENTRY_WINDOW_MS) {
    return 'entry'
  }

  const bucket = userBuckets.get(args.userId)
  if (!bucket || now - bucket.windowStartMs >= WINDOW_MS) {
    userBuckets.set(args.userId, { count: 1, windowStartMs: now })
    entryBuckets.set(args.entryId, now)
    return null
  }

  bucket.count += 1
  if (bucket.count > MAX_PER_USER_PER_HOUR) {
    return 'user'
  }
  entryBuckets.set(args.entryId, now)
  return null
}

/** @internal */
export function clearSignatureRequestRateLimitForTests(): void {
  userBuckets.clear()
  entryBuckets.clear()
}
