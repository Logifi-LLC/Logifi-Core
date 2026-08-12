/**
 * FLICA portal HTTP client: login + schedule HTML fetch.
 *
 * Login contract (from RJET public login-bundle.js):
 *   POST /public/flicaLogon.cgi  fields: id, password  (form post)
 * Schedule surface (observed): /online/mainmenu.cgi → Schedules → month detail.
 */

const FLICA_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type FlicaClientErrorCode =
  | 'login_failed'
  | 'mfa_required'
  | 'schedule_not_found'
  | 'network'
  | 'unknown'

export class FlicaClientError extends Error {
  code: FlicaClientErrorCode
  constructor(code: FlicaClientErrorCode, message: string) {
    super(message)
    this.name = 'FlicaClientError'
    this.code = code
  }
}

export class FlicaSession {
  private cookies = new Map<string, string>()
  readonly host: string

  constructor(host: string) {
    this.host = host.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  private origin(): string {
    return `https://${this.host}`
  }

  private absorbCookies(response: Response) {
    const headerWithGetter = response.headers as Headers & { getSetCookie?: () => string[] }
    const setCookies =
      typeof headerWithGetter.getSetCookie === 'function'
        ? headerWithGetter.getSetCookie()
        : []
    if (setCookies.length === 0) {
      const raw = response.headers.get('set-cookie')
      if (raw) setCookies.push(raw)
    }
    for (const cookie of setCookies) {
      const part = cookie.split(';')[0]?.trim()
      if (!part) continue
      const eq = part.indexOf('=')
      if (eq > 0) {
        this.cookies.set(part.slice(0, eq), part.slice(eq + 1))
      }
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async request(
    pathOrUrl: string,
    init: RequestInit = {}
  ): Promise<{ response: Response; html: string; finalUrl: string }> {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${this.origin()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`

    const headers: Record<string, string> = {
      'User-Agent': FLICA_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(init.headers as Record<string, string> | undefined),
    }
    const cookie = this.cookieHeader()
    if (cookie) headers.Cookie = cookie

    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers,
        redirect: 'manual',
      })
    } catch {
      throw new FlicaClientError('network', 'Could not reach FLICA. Check network and try again.')
    }

    this.absorbCookies(response)

    // Follow redirects manually so we keep cookies.
    let hops = 0
    let current = response
    let currentUrl = url
    while (
      hops < 8 &&
      current.status >= 300 &&
      current.status < 400 &&
      current.headers.get('location')
    ) {
      const loc = current.headers.get('location')!
      currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).toString()
      try {
        current = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': FLICA_USER_AGENT,
            Accept: headers.Accept,
            Cookie: this.cookieHeader(),
            Referer: url,
          },
          redirect: 'manual',
        })
      } catch {
        throw new FlicaClientError('network', 'Could not reach FLICA after login redirect.')
      }
      this.absorbCookies(current)
      hops++
    }

    const html = await current.text()
    return { response: current, html, finalUrl: currentUrl }
  }
}

function looksLikeLoginPage(html: string, finalUrl: string): boolean {
  const u = finalUrl.toLowerCase()
  const h = html.toLowerCase()
  // SPA login route is definitive.
  if (u.includes('/ui/public/login')) return true
  if (h.includes('sign in to flica')) return true
  if (h.includes('failedattempt')) return true
  if (h.includes('invalid user') || h.includes('invalid password')) return true
  if (h.includes('logon failed') || h.includes('login failed')) return true
  // Angular login root without having reached crew menus.
  if (h.includes('<login') && h.includes('password') && !h.includes('crewmember')) return true
  return false
}

function looksLikeMfaOrChallenge(html: string): boolean {
  const h = html.toLowerCase()
  return (
    h.includes('two-factor') ||
    h.includes('two factor') ||
    h.includes('verification code') ||
    h.includes('captcha') ||
    h.includes('one-time password') ||
    /\benter\s+otp\b/.test(h) ||
    /\bmfa\b/.test(h)
  )
}

function looksLikeAuthenticatedMenu(html: string, finalUrl: string): boolean {
  const u = finalUrl.toLowerCase()
  const h = html.toLowerCase()
  if (u.includes('/online/mainmenu') || u.includes('/online/')) {
    if (!looksLikeLoginPage(html, finalUrl)) return true
  }
  if (h.includes('crewmember menu') || h.includes('schedules')) return true
  if (h.includes('main menu') && h.includes('flica')) return true
  return false
}

/**
 * Log into FLICA. Throws FlicaClientError on failure.
 */
export async function loginFlica(opts: {
  host: string
  username: string
  password: string
}): Promise<FlicaSession> {
  const session = new FlicaSession(opts.host)

  // Warm cookies / SPA login page (optional; ignore failures).
  try {
    await session.request('/ui/public/login/index.html', { method: 'GET' })
  } catch {
    /* continue — CGI login may still work */
  }

  // Native form field names from login-bundle.js (name="UserId" / name="Password").
  const body = new URLSearchParams({
    UserId: opts.username,
    Password: opts.password,
    RememberMe: 'on',
  })

  const { html, finalUrl, response } = await session.request('/public/flicaLogon.cgi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `https://${opts.host}/ui/public/login/index.html`,
      Origin: `https://${opts.host}`,
    },
    body: body.toString(),
  })

  if (looksLikeMfaOrChallenge(html)) {
    throw new FlicaClientError(
      'mfa_required',
      'FLICA requires extra verification (MFA/CAPTCHA). Reconnect is not supported for that yet.'
    )
  }

  if (response.status === 403) {
    throw new FlicaClientError(
      'network',
      'FLICA blocked the login request (403). Try again later or from another network.'
    )
  }

  if (response.status >= 400 || looksLikeLoginPage(html, finalUrl)) {
    throw new FlicaClientError(
      'login_failed',
      'FLICA login failed. Check User ID and password, then try again.'
    )
  }

  // Confirm session by hitting main menu (unless logon already landed there).
  if (looksLikeAuthenticatedMenu(html, finalUrl)) {
    return session
  }

  const menu = await session.request('/online/mainmenu.cgi', {
    method: 'GET',
    headers: { Referer: `https://${opts.host}/public/flicaLogon.cgi` },
  })
  if (looksLikeLoginPage(menu.html, menu.finalUrl)) {
    throw new FlicaClientError(
      'login_failed',
      'FLICA login failed. Check User ID and password, then try again.'
    )
  }
  if (looksLikeMfaOrChallenge(menu.html)) {
    throw new FlicaClientError(
      'mfa_required',
      'FLICA requires extra verification (MFA/CAPTCHA). Reconnect is not supported for that yet.'
    )
  }
  if (menu.response.status >= 400 && !looksLikeAuthenticatedMenu(menu.html, menu.finalUrl)) {
    throw new FlicaClientError(
      'login_failed',
      'FLICA login failed. Check User ID and password, then try again.'
    )
  }

  return session
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

function monthsInRange(dateFrom: string, dateTo: string): Array<{ year: number; month: number }> {
  const from = dateFrom.slice(0, 7)
  const to = dateTo.slice(0, 7)
  const [fy, fm] = from.split('-').map((n) => parseInt(n, 10))
  const [ty, tm] = to.split('-').map((n) => parseInt(n, 10))
  if (!fy || !fm || !ty || !tm) return []
  const out: Array<{ year: number; month: number }> = []
  let y = fy
  let m = fm
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ year: y, month: m })
    m++
    if (m > 12) {
      m = 1
      y++
    }
    if (out.length > 24) break
  }
  return out
}

function extractHref(tag: string): string | null {
  const m = tag.match(/href\s*=\s*["']([^"']+)["']/i)
  return m?.[1] ?? null
}

/**
 * Find schedule month links in mainmenu HTML for the requested calendar months.
 */
export function findScheduleMonthLinks(
  html: string,
  targets: Array<{ year: number; month: number }>
): string[] {
  const links: string[] = []
  const seen = new Set<string>()
  const anchorRe = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html))) {
    const tag = match[0]
    const text = tag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    const href = extractHref(tag)
    if (!href) continue

    for (const t of targets) {
      const full = MONTH_NAMES[t.month - 1]
      const abbr = full.slice(0, 3)
      const yearStr = String(t.year)
      const yearShort = yearStr.slice(2)
      const mentionsMonth =
        text.includes(full) ||
        text.includes(abbr) ||
        new RegExp(`\\b${abbr}\\b`, 'i').test(text)
      const mentionsYear =
        text.includes(yearStr) ||
        text.includes(`'${yearShort}`) ||
        text.includes(yearShort) ||
        !/\d{2,4}/.test(text) // month-only link in current year folder
      if (mentionsMonth && mentionsYear) {
        if (!seen.has(href)) {
          seen.add(href)
          links.push(href)
        }
      }
    }
  }

  // Fallback: any Schedules-folder style links that look like month picks.
  if (links.length === 0) {
    const loose = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[^<]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[^<]*<\/a>/gi) ?? []
    for (const tag of loose) {
      const href = extractHref(tag)
      if (href && !seen.has(href)) {
        seen.add(href)
        links.push(href)
      }
    }
  }

  return links
}

function htmlLooksLikeScheduleDetail(html: string): boolean {
  const h = html.toLowerCase()
  return (
    (h.includes('schedule') && (h.includes('block') || h.includes('credit') || h.includes('crew:'))) ||
    /l\d{3,5}\s*:/i.test(html) ||
    /\b[A-Z]{3}-[A-Z]{3}\b/.test(html)
  )
}

/**
 * After login, fetch refrigerator-list / schedule-detail HTML for the date range.
 */
export async function fetchScheduleHtml(
  session: FlicaSession,
  opts: { dateFrom: string; dateTo: string }
): Promise<string> {
  const dateFrom = opts.dateFrom || new Date().toISOString().slice(0, 10)
  const dateTo = opts.dateTo || dateFrom
  const targets = monthsInRange(dateFrom, dateTo)
  if (targets.length === 0) {
    throw new FlicaClientError('schedule_not_found', 'Invalid date range for FLICA schedule fetch.')
  }

  const menu = await session.request(
    `/online/mainmenu.cgi?nocache=${Date.now()}`,
    { method: 'GET' }
  )
  if (looksLikeLoginPage(menu.html, menu.finalUrl)) {
    throw new FlicaClientError('login_failed', 'FLICA session expired. Reconnect and try again.')
  }

  const parts: string[] = []
  if (htmlLooksLikeScheduleDetail(menu.html)) {
    parts.push(menu.html)
  }

  const hrefs = findScheduleMonthLinks(menu.html, targets)
  for (const href of hrefs) {
    const abs = href.startsWith('http')
      ? href
      : href.startsWith('/')
        ? href
        : `/online/${href}`
    try {
      const page = await session.request(abs, {
        method: 'GET',
        headers: { Referer: menu.finalUrl },
      })
      if (!looksLikeLoginPage(page.html, page.finalUrl)) {
        parts.push(page.html)
      }
    } catch {
      /* try remaining links */
    }
  }

  // Some portals expose schedule via query on mainmenu; try month name query fallbacks.
  if (parts.length === 0) {
    for (const t of targets) {
      const name = MONTH_NAMES[t.month - 1]
      const candidates = [
        `/online/mainmenu.cgi?schedule=${t.year}-${String(t.month).padStart(2, '0')}`,
        `/online/mainmenu.cgi?month=${t.month}&year=${t.year}`,
        `/online/mainmenu.cgi?Schedules=${encodeURIComponent(name)}`,
      ]
      for (const path of candidates) {
        try {
          const page = await session.request(path, { method: 'GET' })
          if (htmlLooksLikeScheduleDetail(page.html)) {
            parts.push(page.html)
            break
          }
        } catch {
          /* continue */
        }
      }
    }
  }

  const combined = parts.join('\n\n')
  if (!combined.trim() || !htmlLooksLikeScheduleDetail(combined)) {
    throw new FlicaClientError(
      'schedule_not_found',
      'Logged into FLICA but could not load schedule detail for that date range. The portal layout may have changed.'
    )
  }

  return combined
}
