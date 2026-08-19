/**
 * FLICA portal HTTP client: login + schedule HTML fetch.
 *
 * Login contract (from RJET public login-bundle.js):
 *   POST /public/flicaLogon.cgi  fields: UserId, Password, RememberMe
 * Schedule surface (observed): /online/mainmenu.cgi → Schedules → month detail.
 */

import { parseFlicaSchedule, summarizeFlicaHtml } from './flicaParse'

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

    const html = await readFlicaHtml(current, currentUrl)
    return { response: current, html, finalUrl: currentUrl }
  }
}

/**
 * FLICA CGI pages are ISO-8859-1 (nbsp 0xA0). Node's response.text() defaults to UTF-8
 * when Content-Type omits charset, which turns 0xA0 into U+FFFD and breaks the parser.
 */
export function decodeFlicaHtmlBytes(
  buf: Buffer,
  contentType: string,
  url = ''
): string {
  const headerCharset =
    contentType.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase() ?? ''
  const peek = buf.subarray(0, 2048).toString('latin1')
  const meta =
    peek.match(/charset\s*=\s*["']?([a-z0-9-]+)/i)?.[1]?.toLowerCase() ?? ''
  const charset = headerCharset || meta
  if (charset.includes('utf-8') || charset === 'utf8') return buf.toString('utf8')
  if (
    charset.includes('8859') ||
    charset.includes('1252') ||
    charset === 'latin1' ||
    charset === 'latin-1'
  ) {
    return buf.toString('latin1')
  }
  if (/\.cgi(?:\?|$)/i.test(url) || /scheduledetail|leftmenu|mainmenu/i.test(url)) {
    return buf.toString('latin1')
  }
  return buf.toString('utf8')
}

async function readFlicaHtml(response: Response, url: string): Promise<string> {
  const withBuf = response as Response & { arrayBuffer?: () => Promise<ArrayBuffer> }
  if (typeof withBuf.arrayBuffer === 'function') {
    try {
      const buf = Buffer.from(await withBuf.arrayBuffer())
      return decodeFlicaHtmlBytes(buf, response.headers.get('content-type') || '', url)
    } catch {
      /* unit-test mocks may only implement text() */
    }
  }
  return response.text()
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

function resolveOnlineHref(href: string): string {
  if (href.startsWith('http') || href.startsWith('/')) return href
  return `/online/${href}`
}

/** Candidate absolute paths for Republic schedule detail CGI. */
function scheduleDetailPathVariants(query: string): string[] {
  const q = query.startsWith('?') ? query : `?${query}`
  // Republic (rpa.flica.net) serves schedule detail under /full/, not /online/.
  return [
    `/full/scheduledetail.cgi${q}`,
    `/online/scheduledetail.cgi${q}`,
    `/scheduledetail.cgi${q}`,
  ]
}

/**
 * Prefer /full/scheduledetail.cgi when HTML only has a bare relative CGI name.
 */
function resolveScheduleDetailHref(href: string): string {
  const cleaned = href.replace(/&amp;/g, '&').trim()
  if (cleaned.startsWith('http') || cleaned.startsWith('/')) return cleaned
  if (/^scheduledetail\.cgi/i.test(cleaned)) {
    return `/full/${cleaned}`
  }
  return resolveOnlineHref(cleaned)
}

/**
 * Collect scheduledetail.cgi URLs (Republic schedule detail) from menu HTML.
 * Preserves whatever directory prefix appears in the HTML when present.
 */
export function findScheduleDetailLinks(html: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (raw: string) => {
    const cleaned = raw.replace(/&amp;/g, '&').trim()
    if (!/scheduledetail\.cgi/i.test(cleaned)) return
    const href = resolveScheduleDetailHref(cleaned)
    if (!seen.has(href)) {
      seen.add(href)
      out.push(href)
    }
    const qIdx = cleaned.indexOf('?')
    if (qIdx >= 0) {
      for (const variant of scheduleDetailPathVariants(cleaned.slice(qIdx))) {
        if (!seen.has(variant)) {
          seen.add(variant)
          out.push(variant)
        }
      }
    }
  }

  const re = /(?:\/(?:online|full)\/)?scheduledetail\.cgi\?[^"'\\\s<>]*/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    push(match[0])
  }
  for (const { href } of anchorEntries(html)) {
    if (/scheduledetail\.cgi/i.test(href)) push(href)
  }
  return out
}

function buildScheduleDetailUrls(
  targets: Array<{ year: number; month: number }>,
  token: string | null
): string[] {
  const urls: string[] = []
  const junk = Date.now()
  for (const t of targets) {
    const block = flicaBlockDate(t.year, t.month)
    // Browser Network order: BlockDate first (session warm), then GO=1 (content).
    const queries = token
      ? [
          `BlockDate=${block}&token=${token}`,
          `GO=1&token=${token}&BlockDate=${block}&JUNK=${junk}`,
        ]
      : [`BlockDate=${block}`, `GO=1&BlockDate=${block}&JUNK=${junk}`]
    for (const q of queries) {
      urls.push(...scheduleDetailPathVariants(`?${q}`))
    }
  }
  return urls
}

function isSkippableNavHref(href: string): boolean {
  const h = href.trim().toLowerCase()
  if (!h || h === '#' || h.startsWith('mailto:') || h.startsWith('tel:')) return true
  if (h.startsWith('javascript:')) {
    // Keep only if we can pull a quoted path out later.
    return !/['"][^'"]+\.cgi[^'"]*['"]/i.test(href)
  }
  return false
}

/**
 * Collect navigable URLs from anchors, frames, and simple JS location assignments.
 */
export function extractCandidateUrls(html: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined) => {
    if (!raw) return
    let href = raw.trim()
    if (isSkippableNavHref(href)) {
      const jsPath = href.match(/['"]([^'"]+\.cgi[^'"]*)['"]/i)
      if (!jsPath) return
      href = jsPath[1]
    }
    if (href.startsWith('javascript:')) return
    const resolved = resolveOnlineHref(href)
    if (seen.has(resolved)) return
    seen.add(resolved)
    out.push(resolved)
  }

  const anchorRe = /<a\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html))) {
    push(extractHref(match[0]))
  }

  const frameRe = /<(?:frame|iframe)\b[^>]*>/gi
  while ((match = frameRe.exec(html))) {
    const src = match[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)
    push(src?.[1])
  }

  const locRe =
    /(?:location(?:\.href)?|window\.open|openDocument|go_to|NavigateTo)\s*(?:\(\s*|\s*=\s*)["']([^"']+)["']/gi
  while ((match = locRe.exec(html))) {
    push(match[1])
  }

  return out
}

function anchorEntries(html: string): Array<{ href: string; text: string }> {
  const entries: Array<{ href: string; text: string }> = []
  const anchorRe = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html))) {
    const tag = match[0]
    const href = extractHref(tag)
    if (!href || isSkippableNavHref(href)) continue
    const text = tag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    entries.push({ href: resolveOnlineHref(href), text })
  }
  return entries
}

/**
 * Find "Schedules" folder / navigation links on the crew main menu.
 */
export function findSchedulesFolderLinks(html: string): string[] {
  const links: string[] = []
  const seen = new Set<string>()
  for (const { href, text } of anchorEntries(html)) {
    const t = text.toLowerCase()
    if (!t.includes('schedule')) continue
    if (/l[\da-z]+\s*:/i.test(text)) continue
    if (!seen.has(href)) {
      seen.add(href)
      links.push(href)
    }
  }
  return links
}

function monthMentioned(
  haystack: string,
  target: { year: number; month: number }
): boolean {
  const text = haystack.toLowerCase()
  const full = MONTH_NAMES[target.month - 1]
  const abbr = full.slice(0, 3)
  const yearStr = String(target.year)
  const yearShort = yearStr.slice(2)
  const mm = String(target.month).padStart(2, '0')
  const mentionsMonth =
    text.includes(full) ||
    new RegExp(`\\b${abbr}\\b`, 'i').test(text) ||
    text.includes(`${mm}/`) ||
    text.includes(`/${mm}`) ||
    text.includes(`-${mm}`) ||
    text.includes(`month=${target.month}`) ||
    text.includes(`month=${mm}`) ||
    text.includes(`${yearStr}-${mm}`) ||
    text.includes(`${mm}${yearShort}`) ||
    text.includes(`${mm}${yearStr}`)
  if (!mentionsMonth) return false
  const mentionsYear =
    text.includes(yearStr) ||
    text.includes(`'${yearShort}`) ||
    text.includes(yearShort) ||
    !/\d{2,4}/.test(text)
  return mentionsYear
}

/**
 * Find schedule month links in mainmenu / Schedules-folder HTML for the requested calendar months.
 */
export function findScheduleMonthLinks(
  html: string,
  targets: Array<{ year: number; month: number }>
): string[] {
  const links: string[] = []
  const seen = new Set<string>()

  for (const { href, text } of anchorEntries(html)) {
    const blob = `${text} ${href}`
    for (const t of targets) {
      if (monthMentioned(blob, t) && !seen.has(href)) {
        seen.add(href)
        links.push(href)
      }
    }
  }

  // Fallback: any month-name anchors if primary matching found nothing.
  if (links.length === 0) {
    for (const { href, text } of anchorEntries(html)) {
      if (
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text) &&
        !seen.has(href)
      ) {
        seen.add(href)
        links.push(href)
      }
    }
  }

  return links
}

/**
 * True only for refrigerator / trip-detail HTML — not crew mainmenu chrome.
 * Requires a trip header (e.g. L7G13 :) and at least one route/leg signal.
 */
export function htmlLooksLikeScheduleDetail(html: string): boolean {
  const hasTrip = /L\d[\dA-Z]*\s*:/i.test(html)
  const hasLeg =
    /\b(?:MO|TU|WE|TH|FR|SA|SU)\s+\d{1,2}\s+(?:\*\s+)?\d{3,4}\s+[A-Z]{3}-[A-Z]{3}/i.test(
      html
    ) || /\b\d{3,4}\s+[A-Z]{3}-[A-Z]{3}\b/.test(html)
  // HTML tables may separate cells; still treat trip + route as detail.
  const hasRoute = /\b[A-Z]{3}-[A-Z]{3}\b/.test(html)
  // Reject frameset shells that coincidentally match trip-like tokens.
  if (/<frameset\b/i.test(html) && !hasLeg) return false
  return (hasTrip && hasLeg) || (hasTrip && hasRoute && html.length > 800)
}

/** Prefer parser over raw-HTML heuristics (table markup breaks leg regexes). */
export function htmlHasParseableScheduleLegs(html: string): boolean {
  if (htmlLooksLikeScheduleDetail(html)) return true
  if (/<frameset\b/i.test(html)) return false
  try {
    return parseFlicaSchedule(html).length > 0
  } catch {
    return false
  }
}

function redactTokenInUrl(url: string): string {
  return url.replace(/([?&]token=)[^&]+/gi, '$1REDACTED')
}

/** FLICA BlockDate query value: MMYY (e.g. Aug 2026 → 0826). */
export function flicaBlockDate(year: number, month: number): string {
  const mm = String(month).padStart(2, '0')
  const yy = String(year % 100).padStart(2, '0')
  return `${mm}${yy}`
}

/** Extract FLICA navigation token from HTML (scheduledetail / leftmenu). */
export function extractFlicaToken(html: string): string | null {
  // Prefer token on a GO=1 scheduledetail URL when present (post-warm refresh).
  const goToken = html.match(
    /scheduledetail\.cgi\?[^"'\\\s]*GO=1[^"'\\\s]*[?&]token=([0-9A-Fa-f]{16,})/i
  )
  if (goToken?.[1]) return goToken[1]
  const goTokenAlt = html.match(
    /scheduledetail\.cgi\?[^"'\\\s]*[?&]token=([0-9A-Fa-f]{16,})[^"'\\\s]*GO=1/i
  )
  if (goTokenAlt?.[1]) return goTokenAlt[1]

  const all = [...html.matchAll(/[?&]token=([0-9A-Fa-f]{16,})/gi)]
  if (all.length > 0) return all[all.length - 1][1]
  const m = html.match(/\btoken["'\s:=]+([0-9A-Fa-f]{16,})/i)
  return m?.[1] ?? null
}

function htmlTextSnippet(html: string, maxLen = 220): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/**
 * After login, fetch refrigerator-list / schedule-detail HTML for the date range.
 * Republic path: mainmenu frameset → leftmenu.cgi → scheduledetail.cgi?BlockDate=MMYY.
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

  // Left menu is where August / scheduledetail links live (mainmenu is only a frameset).
  let leftHtml = ''
  let leftUrl = menu.finalUrl
  try {
    const left = await session.request('/online/leftmenu.cgi?whosepage=Crewmember', {
      method: 'GET',
      headers: { Referer: menu.finalUrl },
    })
    if (!looksLikeLoginPage(left.html, left.finalUrl)) {
      leftHtml = left.html
      leftUrl = left.finalUrl
    }
  } catch {
    /* still try constructed scheduledetail URLs */
  }

  let token = extractFlicaToken(leftHtml) || extractFlicaToken(menu.html)
  const detailFromMenu = findScheduleDetailLinks(leftHtml || menu.html)
  const wantedBlocks = new Set(targets.map((t) => flicaBlockDate(t.year, t.month)))

  if (!token) {
    for (const href of detailFromMenu) {
      token = extractFlicaToken(href) || token
    }
  }

  let pagesScanned = 1 + (leftHtml ? 1 : 0)
  let lastAttempt:
    | {
        url: string
        bytes: number
        parsedLegs: number
        looksLikeDetail: boolean
        snippet: string
      }
    | null = null

  const recordAttempt = (path: string, html: string, status: number) => {
    const is404 =
      status === 404 || /404\s*-\s*file or directory not found/i.test(html)
    lastAttempt = {
      url: redactTokenInUrl(path),
      bytes: html.length,
      parsedLegs: parseFlicaSchedule(html).length,
      looksLikeDetail: htmlLooksLikeScheduleDetail(html),
      snippet: is404
        ? `HTTP ${status}: ${htmlTextSnippet(html)}`
        : htmlTextSnippet(html),
    }
  }

  /**
   * Republic browser flow (from Network):
   * 1) GET /full/scheduledetail.cgi?BlockDate=MMYY&token=T0  (Referer: leftmenu) ~2KB
   * 2) GET /full/scheduledetail.cgi?GO=1&token=T1&BlockDate=MMYY&JUNK=… (Referer: step 1) ~65KB
   * Token T1 is taken from step 1 HTML — it differs from T0.
   */
  for (const t of targets) {
    const block = flicaBlockDate(t.year, t.month)

    const warmCandidates: string[] = []
    const seenWarm = new Set<string>()
    const pushWarm = (href: string) => {
      const abs =
        href.startsWith('http') || href.startsWith('/')
          ? href
          : resolveScheduleDetailHref(href)
      if (seenWarm.has(abs)) return
      if (/[?&]GO=1(?:&|$)/i.test(abs)) return
      const b = abs.match(/BlockDate=(\d{4})/i)?.[1]
      if (b && b !== block) return
      seenWarm.add(abs)
      warmCandidates.push(abs)
    }

    for (const href of detailFromMenu) {
      if (href.match(/BlockDate=(\d{4})/i)?.[1] === block) pushWarm(href)
    }
    if (token) {
      pushWarm(`/full/scheduledetail.cgi?BlockDate=${block}&token=${token}`)
    }
    pushWarm(`/full/scheduledetail.cgi?BlockDate=${block}`)

    for (const warmPath of warmCandidates) {
      let warmHtml = ''
      let warmFinalUrl = warmPath
      try {
        const warm = await session.request(warmPath, {
          method: 'GET',
          headers: {
            Referer: leftUrl,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        })
        pagesScanned++
        if (looksLikeLoginPage(warm.html, warm.finalUrl)) continue
        recordAttempt(warmPath, warm.html, warm.response.status)
        const warm404 =
          warm.response.status === 404 ||
          /404\s*-\s*file or directory not found/i.test(warm.html)
        if (warm404) continue
        warmHtml = warm.html
        warmFinalUrl = warm.finalUrl
        // Do not return the warm stub here — it is ~2KB with template/scheduled times.
        // The GO=1 follow-up (~65KB) has updated actual gate times for completed legs.
      } catch {
        continue
      }

      const goToken =
        extractFlicaToken(warmHtml) || extractFlicaToken(warmPath) || token
      if (!goToken) {
        if (warmHtml && htmlHasParseableScheduleLegs(warmHtml)) return warmHtml
        continue
      }
      token = goToken

      const goPath = `/full/scheduledetail.cgi?GO=1&token=${goToken}&BlockDate=${block}&JUNK=${Date.now()}`
      try {
        const go = await session.request(goPath, {
          method: 'GET',
          headers: {
            Referer: warmFinalUrl,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        })
        pagesScanned++
        if (looksLikeLoginPage(go.html, go.finalUrl)) continue
        recordAttempt(goPath, go.html, go.response.status)
        const go404 =
          go.response.status === 404 ||
          /404\s*-\s*file or directory not found/i.test(go.html)
        if (go404) continue
        if (htmlHasParseableScheduleLegs(go.html)) return go.html
        // Large schedule pages should still be returned for the API parser.
        if (go.html.length > 10000 && /L\d[\dA-Z]*\s*:/i.test(go.html)) {
          return go.html
        }
      } catch {
        /* fall through to warm stub */
      }

      if (warmHtml && htmlHasParseableScheduleLegs(warmHtml)) return warmHtml
    }
  }

  const monthLinkCount = detailFromMenu.filter((href) => {
    const block = href.match(/BlockDate=(\d{4})/i)?.[1]
    return !block || wantedBlocks.has(block)
  }).length

  const attemptHint = lastAttempt
    ? ` Last scheduledetail try: ${lastAttempt.url} (${lastAttempt.bytes} bytes, parser=${lastAttempt.parsedLegs} leg(s)). Page text: "${lastAttempt.snippet}"`
    : ' No scheduledetail response body was usable.'

  throw new FlicaClientError(
    'schedule_not_found',
    `Logged into FLICA but could not load schedule detail for that date range (scanned ${pagesScanned} pages, ${monthLinkCount} month link(s), token=${token ? 'yes' : 'no'}).${attemptHint}`
  )
}

export interface FlicaMenuProbeResult {
  finalUrl: string
  htmlLength: number
  isFrameset: boolean
  frameSrcs: string[]
  linkCount: number
  links: Array<{ text: string; href: string }>
  candidateUrlCount: number
  candidateUrls: string[]
  folderLinks: string[]
  monthLinks: string[]
  leftMenuUrl: string | null
  leftMenuHtmlLength: number | null
  leftMenuLinkCount: number | null
  leftMenuLinks: Array<{ text: string; href: string }>
  scheduleDetailLinks: string[]
  tokenFound: boolean
  textSnippet: string
  hasTripHeader: boolean
  hasRouteToken: boolean
  scheduleHtmlLength: number | null
  scheduleParsedLegCount: number | null
  scheduleTripCount: number | null
  scheduleHasL7G13: boolean | null
  scheduleHas4442: boolean | null
  scheduleSample: string | null
  scheduleError: string | null
}

/**
 * Login and summarize what the scraper sees on mainmenu + leftmenu (for debugging navigation).
 */
export async function probeFlicaMenu(
  session: FlicaSession,
  opts: { dateFrom?: string; dateTo?: string } = {}
): Promise<FlicaMenuProbeResult> {
  const dateFrom = opts.dateFrom || new Date().toISOString().slice(0, 10)
  const dateTo = opts.dateTo || dateFrom
  const targets = monthsInRange(dateFrom, dateTo)

  const menu = await session.request(
    `/online/mainmenu.cgi?nocache=${Date.now()}`,
    { method: 'GET' }
  )
  if (looksLikeLoginPage(menu.html, menu.finalUrl)) {
    throw new FlicaClientError('login_failed', 'FLICA session expired. Reconnect and try again.')
  }

  const html = menu.html
  const links = anchorEntries(html).slice(0, 40)
  const candidates = extractCandidateUrls(html).slice(0, 40)
  const folderLinks = findSchedulesFolderLinks(html)
  const monthLinks = findScheduleMonthLinks(html, targets)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let leftMenuUrl: string | null = null
  let leftMenuHtmlLength: number | null = null
  let leftMenuLinkCount: number | null = null
  let leftMenuLinks: Array<{ text: string; href: string }> = []
  let scheduleDetailLinks: string[] = []
  let tokenFound = Boolean(extractFlicaToken(html))

  try {
    const left = await session.request('/online/leftmenu.cgi?whosepage=Crewmember', {
      method: 'GET',
      headers: { Referer: menu.finalUrl },
    })
    if (!looksLikeLoginPage(left.html, left.finalUrl)) {
      leftMenuUrl = left.finalUrl
      leftMenuHtmlLength = left.html.length
      const leftAnchors = anchorEntries(left.html)
      leftMenuLinkCount = leftAnchors.length
      leftMenuLinks = leftAnchors.slice(0, 40).map((l) => ({
        text: l.text.slice(0, 80),
        href: l.href.slice(0, 240),
      }))
      scheduleDetailLinks = findScheduleDetailLinks(left.html).slice(0, 20)
      if (extractFlicaToken(left.html)) tokenFound = true
    }
  } catch {
    /* leave left menu fields null */
  }

  const scheduleSummary: {
    htmlLength: number | null
    parsedLegCount: number | null
    tripCount: number | null
    hasL7G13: boolean | null
    has4442: boolean | null
    sample: string | null
    error: string | null
  } = {
    htmlLength: null,
    parsedLegCount: null,
    tripCount: null,
    hasL7G13: null,
    has4442: null,
    sample: null,
    error: null,
  }
  try {
    const scheduleHtml = await fetchScheduleHtml(session, { dateFrom, dateTo })
    const sum = summarizeFlicaHtml(scheduleHtml)
    const defaultYear = parseInt(dateFrom.slice(0, 4), 10)
    scheduleSummary.htmlLength = sum.bytes
    scheduleSummary.parsedLegCount = parseFlicaSchedule(scheduleHtml, {
      defaultYear: Number.isFinite(defaultYear) ? defaultYear : undefined,
    }).length
    scheduleSummary.tripCount = sum.tripCount
    scheduleSummary.hasL7G13 = sum.hasL7G13
    scheduleSummary.has4442 = sum.has4442
    scheduleSummary.sample = sum.sample
  } catch (e) {
    scheduleSummary.error =
      e instanceof Error ? e.message.slice(0, 400) : 'schedule fetch failed'
  }

  return {
    finalUrl: menu.finalUrl,
    htmlLength: html.length,
    isFrameset: /<frameset\b/i.test(html) || /<iframe\b/i.test(html),
    frameSrcs: candidates.filter((u) => /frame|nav|menu|left|right|content/i.test(u)).slice(0, 20),
    linkCount: anchorEntries(html).length,
    links: links.map((l) => ({
      text: l.text.slice(0, 80),
      href: l.href.slice(0, 200),
    })),
    candidateUrlCount: extractCandidateUrls(html).length,
    candidateUrls: candidates,
    folderLinks,
    monthLinks,
    leftMenuUrl,
    leftMenuHtmlLength,
    leftMenuLinkCount,
    leftMenuLinks,
    scheduleDetailLinks,
    tokenFound,
    textSnippet: text.slice(0, 500),
    hasTripHeader: /L\d[\dA-Z]*\s*:/i.test(html),
    hasRouteToken: /\b[A-Z]{3}-[A-Z]{3}\b/.test(html),
    scheduleHtmlLength: scheduleSummary.htmlLength,
    scheduleParsedLegCount: scheduleSummary.parsedLegCount,
    scheduleTripCount: scheduleSummary.tripCount,
    scheduleHasL7G13: scheduleSummary.hasL7G13,
    scheduleHas4442: scheduleSummary.has4442,
    scheduleSample: scheduleSummary.sample,
    scheduleError: scheduleSummary.error,
  }
}
