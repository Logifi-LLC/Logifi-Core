/**
 * Outbound FC View API / OAuth calls: retry transient failures (429, 5xx) with backoff.
 * See docs/fcv-indie-readiness-phases-2-6.md Phase 4.
 */

export type FcvFetchRetryOptions = RequestInit & {
  maxAttempts?: number
  baseDelayMs?: number
  /** Prefix for console warnings when retrying */
  logLabel?: string
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null
  const trimmed = header.trim()
  const asSeconds = Number(trimmed)
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.min(asSeconds * 1000, 60_000)
  }
  const asDate = Date.parse(trimmed)
  if (Number.isFinite(asDate)) {
    const ms = asDate - Date.now()
    return ms > 0 ? Math.min(ms, 60_000) : null
  }
  return null
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * `fetch` with retries on 429 and 5xx. Honors `Retry-After` when present (seconds or HTTP-date).
 * Caps per-wait at 30s; default up to 4 attempts.
 */
export async function fetchFcvWithRetry(
  url: string,
  init: FcvFetchRetryOptions = {}
): Promise<Response> {
  const maxAttempts = init.maxAttempts ?? 4
  const baseDelayMs = init.baseDelayMs ?? 500
  const logLabel = init.logLabel ?? 'FC View HTTP'
  const { maxAttempts: _ma, baseDelayMs: _bd, logLabel: _ll, ...fetchInit } = init

  let lastResponse: Response | undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, fetchInit)
    lastResponse = res
    if (res.ok) return res

    const isLast = attempt === maxAttempts - 1
    if (!isRetriableStatus(res.status) || isLast) {
      return res
    }

    let delayMs = baseDelayMs * 2 ** attempt
    const raMs = parseRetryAfterMs(res.headers.get('retry-after'))
    if (raMs !== null) {
      delayMs = Math.max(delayMs, raMs)
    }
    delayMs = Math.min(delayMs, 30_000)

    console.warn(
      `${logLabel}: ${res.status} — retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxAttempts})`
    )
    await new Promise((r) => setTimeout(r, delayMs))
  }

  return lastResponse as Response
}
