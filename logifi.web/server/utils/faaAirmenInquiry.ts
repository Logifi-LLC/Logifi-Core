/**
 * FAA Civil Aviation Registry — Airmen Inquiry (public web search).
 * https://amsrvs.registry.faa.gov/airmeninquiry/
 */

import {
  formatAirmanRegistryName,
  formatGroupedCertificateBlocks,
  formatRegistryLabel,
  formatTypeRatingCode,
  isInstructorCertificateLevel,
} from './airmanRegistryFormat'

const FAA_AIRMEN_INQUIRY_URL = 'https://amsrvs.registry.faa.gov/airmeninquiry/'
const FAA_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FIELD_LAST_NAME = 'ctl00$content$ctl01$txtbxLastName'
const FIELD_CERT_NO = 'ctl00$content$ctl01$txtbxCertNo'
const FIELD_FIRST_NAME = 'ctl00$content$ctl01$txtbxFirstName'

export interface AirmanRegistryCandidate {
  displayName: string
  eventTarget: string
}

export interface AirmanRegistryData {
  name: string
  certificates: string
  certificateLevels: string[]
  ratings: string[]
  typeRatings: string[]
  residentialAddress?: string
  residentialCity?: string
  residentialState?: string
  residentialZip?: string
  medicalClass?: string
  medicalDate?: string
  source: string
}

export type AirmanRegistryLookupResult =
  | { ok: true; data: AirmanRegistryData }
  | { ok: false; error: string }
  | { ok: false; code: 'MULTIPLE_MATCHES'; message: string; candidates: AirmanRegistryCandidate[] }

export interface AirmanRegistrySearchInput {
  lastName: string
  certificateNumber: string
  firstName?: string
  /** ASP.NET __EVENTTARGET from a prior MULTIPLE_MATCHES response */
  eventTarget?: string
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove scripts/styles so inline JS and page chrome are not scraped as certificate text. */
function sanitizeFaaDetailHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

const INVALID_REGISTRY_LINE_RE =
  /document\.|getelementbyid|innerhtml|content\s*\+|;\s*content|for\s*\(|if\s*\(|else\s*\{|alert\s*\(|function\s*\(|var\s+\w|federal aviation administration|independence avenue|tell-faa|\.gov\b|1-866-/i

/** Lines must look like FAA certificate levels or ratings, not page JS/footer text. */
const AVIATION_REGISTRY_LINE_RE =
  /\b(pilot|instructor|airplane|rotorcraft|glider|helicopter|instrument|engine|land|sea|multiengine|single|transport|ground|balloon|airship|powered|sport|recreational|weight-shift|parachute|type rating)\b/i

const TYPE_RATING_CELL_RE = /^[A-Z0-9]{1,4}\/[A-Z0-9][A-Z0-9./-]*$/i

function isValidRegistryLine(line: string): boolean {
  const text = line.trim()
  if (text.length < 3 || text.length > 72) return false
  if (INVALID_REGISTRY_LINE_RE.test(text)) return false
  if (!/^[A-Za-z0-9\s/'.,/()-]+$/.test(text)) return false
  if (TYPE_RATING_CELL_RE.test(text.replace(/\s/g, ''))) return true
  return AVIATION_REGISTRY_LINE_RE.test(text)
}

function pushUniqueValid(target: string[], value: string) {
  const trimmed = value.trim()
  if (!trimmed || !isValidRegistryLine(trimmed)) return
  if (!target.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
    target.push(trimmed)
  }
}

function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const inputPattern = /<input\b[^>]*type=["']hidden["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = inputPattern.exec(html)) !== null) {
    const tag = match[0]
    const nameMatch = tag.match(/\bname=["']([^"']+)["']/i)
    const valueMatch = tag.match(/\bvalue=["']([^"']*)["']/i)
    if (nameMatch?.[1]) {
      fields[nameMatch[1]] = decodeHtmlEntities(valueMatch?.[1] ?? '')
    }
  }
  return fields
}

function extractFormFieldValues(html: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const name of [FIELD_LAST_NAME, FIELD_CERT_NO, FIELD_FIRST_NAME]) {
    const match = html.match(new RegExp(`name="${name.replace(/\$/g, '\\$')}"[^>]*value="([^"]*)"`, 'i'))
    if (match?.[1]) values[name] = decodeHtmlEntities(match[1])
  }
  return values
}

function parsePostBackTarget(href: string): string | null {
  const decoded = decodeHtmlEntities(href)
  const match = decoded.match(/__doPostBack\s*\(\s*'([^']+)'/i)
  return match?.[1] ?? null
}

/** Maintains FAA session cookies across GET/POST (required for list → detail postback). */
class FaaInquirySession {
  private cookies = new Map<string, string>()

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

  private baseHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': FAA_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...extra,
    }
    const cookie = this.cookieHeader()
    if (cookie) headers.Cookie = cookie
    return headers
  }

  async get(url: string): Promise<string> {
    const response = await fetch(url, { headers: this.baseHeaders() })
    this.absorbCookies(response)
    if (!response.ok) {
      throw new Error(`FAA inquiry GET failed (${response.status})`)
    }
    return await response.text()
  }

  async post(url: string, body: Record<string, string>): Promise<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.baseHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://amsrvs.registry.faa.gov',
        Referer: FAA_AIRMEN_INQUIRY_URL,
      }),
      body: new URLSearchParams(body).toString(),
    })
    this.absorbCookies(response)
    if (!response.ok) {
      throw new Error(`FAA inquiry POST failed (${response.status})`)
    }
    return await response.text()
  }
}

function searchTotalsMessage(html: string): string | null {
  const match = html.match(/id="ctl00_content_ctl01_lbAirmenTotals"[^>]*>([^<]*)</i)
  return match?.[1]?.trim() ?? null
}

function isDetailPage(html: string): boolean {
  return /id="ctl00_content_ctl01_ctl00_lbName"/i.test(html)
}

export function extractCandidates(html: string): AirmanRegistryCandidate[] {
  const candidates: AirmanRegistryCandidate[] = []
  const pattern = /lnkbtnAirmenName[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\s*\/a>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const eventTarget = parsePostBackTarget(match[1])
    const displayName = stripHtml(match[2])
    if (eventTarget && displayName) {
      candidates.push({
        eventTarget,
        displayName: formatAirmanRegistryName(displayName),
      })
    }
  }
  return candidates
}

/** Underlined / bold category headers in a ratings block (not actual ratings). */
const RATING_CATEGORY_HEADER_RE =
  /^(commercial|private|airline transport|flight|ground|basic ground|advanced ground|instrument|sport|recreational|rotorcraft|glider|free balloon|airship)\b.*\b(pilot|instructor)\b/i

function isRatingCategoryHeader(line: string, certificateLevels: string[]): boolean {
  if (certificateLevels.some((level) => level.toLowerCase() === line.toLowerCase())) return true
  return RATING_CATEGORY_HEADER_RE.test(line)
}

function extractTabBodyHtml(html: string, tabIndex: string): string | null {
  const openMatch = html.match(new RegExp(`id="TabBody${tabIndex}"[^>]*>`, 'i'))
  if (!openMatch || openMatch.index === undefined) return null

  const contentStart = openMatch.index + openMatch[0].length
  let chunk = html.slice(contentStart)

  const stopPatterns = [
    new RegExp(`\\bid="TabBody${Number(tabIndex) + 1}"`, 'i'),
    /<script\b/i,
    /\bid="ctl00_content_ctl01_lbAirmenTotals"/i,
  ]
  let end = chunk.length
  for (const pattern of stopPatterns) {
    const idx = chunk.search(pattern)
    if (idx >= 0 && idx < end) end = idx
  }
  chunk = chunk.slice(0, end)

  const lastClose = chunk.lastIndexOf('</div>')
  return lastClose >= 0 ? chunk.slice(0, lastClose) : chunk
}

function parseRatingsFromTabBody(
  tabHtml: string,
  certificateLevels: string[]
): { ratings: string[]; typeRatings: string[] } {
  const ratings: string[] = []
  const typeRatings: string[] = []

  const ratingsBlock = tabHtml.match(
    /<b>Ratings:<\/b>([\s\S]*?)(?:<label class="Cert_Info"><br\/><b>Type Ratings:<\/b>|<b>Type Ratings:<\/b>|<b>Limitations:<\/b>|<b>Remarks:<\/b>|<\/label>|<script\b)/i
  )
  if (ratingsBlock?.[1]) {
    const brLines = [...ratingsBlock[1].matchAll(/<br\s*\/?>\s*(?:&nbsp;)*([^<]+)/gi)]
      .map((m) => stripHtml(m[1]))
      .filter(Boolean)
    for (const line of brLines) {
      if (!isRatingCategoryHeader(line, certificateLevels)) {
        pushUniqueValid(ratings, line)
      }
    }
  }

  const typeBlock = tabHtml.match(
    /<b>Type Ratings:<\/b>([\s\S]*?)(?:<\/label>|<script\b|<\/div>\s*<div\s+id="TabBody)/i
  )
  if (typeBlock?.[1]) {
    const cells = [...typeBlock[1].matchAll(/<td[^>]*>([^<]+)<\/td>/gi)]
    for (const cell of cells) {
      const value = stripHtml(cell[1])
      if (value && (TYPE_RATING_CELL_RE.test(value.replace(/\s/g, '')) || isValidRegistryLine(value))) {
        pushUniqueValid(typeRatings, value)
      }
    }
  }

  return { ratings, typeRatings }
}

interface ParsedCertTab {
  rawLevel: string
  ratings: string[]
  typeRatings: string[]
}

function formatCertTabLine(tab: ParsedCertTab): string {
  const level = formatRegistryLabel(tab.rawLevel)
  const ratingParts = tab.ratings
    .map(formatRegistryLabel)
    .filter((rating) => rating && rating.toLowerCase() !== level.toLowerCase())
  const parts = level ? [level, ...ratingParts] : [...ratingParts]
  if (tab.typeRatings.length > 0) {
    const codes = tab.typeRatings.map(formatTypeRatingCode).join(', ')
    parts.push(`Type ratings: ${codes}`)
  }
  return parts.join(' · ')
}

export function parseAirmenDetailHtml(html: string): AirmanRegistryData | null {
  if (!isDetailPage(html)) return null

  const sanitized = sanitizeFaaDetailHtml(html)

  const nameMatch = sanitized.match(/id="ctl00_content_ctl01_ctl00_lbName"[^>]*>\s*<b>([^<]+)<\/b>/i)
  const rawName = nameMatch?.[1] ? stripHtml(nameMatch[1]) : ''
  if (!rawName) return null
  const name = formatAirmanRegistryName(rawName)

  const certificateLevels: string[] = []
  const ratings: string[] = []
  const typeRatings: string[] = []
  const certTabs: ParsedCertTab[] = []

  const headerPattern = /id="CertHeader(\d+)">([^<]+)</gi
  let headerMatch: RegExpExecArray | null
  while ((headerMatch = headerPattern.exec(sanitized)) !== null) {
    const tabIndex = headerMatch[1]
    const headerLevel = stripHtml(headerMatch[2])
    const tab: ParsedCertTab = { rawLevel: headerLevel, ratings: [], typeRatings: [] }
    const tabLevels: string[] = []
    if (headerLevel) tabLevels.push(headerLevel)

    const tabHtml = extractTabBodyHtml(sanitized, tabIndex)
    if (!tabHtml) continue

    const certLine = tabHtml.match(/<b>Certificate:<\/b>&nbsp;([^&<]+)/i)
    if (certLine?.[1]) {
      const certLevel = stripHtml(certLine[1])
      if (certLevel) {
        tab.rawLevel = certLevel
        if (!tabLevels.some((l) => l.toLowerCase() === certLevel.toLowerCase())) {
          tabLevels.push(certLevel)
        }
      }
    }

    const parsed = parseRatingsFromTabBody(tabHtml, tabLevels)
    tab.ratings = parsed.ratings
    tab.typeRatings = parsed.typeRatings
    certTabs.push(tab)

    for (const level of tabLevels) pushUniqueValid(certificateLevels, level)
    for (const r of parsed.ratings) pushUniqueValid(ratings, r)
    for (const t of parsed.typeRatings) pushUniqueValid(typeRatings, t)
  }

  if (certificateLevels.length === 0) {
    const tab0 = extractTabBodyHtml(sanitized, '0')
    if (tab0) {
      const certMatch = tab0.match(/<b>Certificate:<\/b>&nbsp;([^&<]+)/i)
      const rawLevel = certMatch?.[1] ? stripHtml(certMatch[1]) : ''
      const tabLevels = rawLevel ? [rawLevel] : []
      const parsed = parseRatingsFromTabBody(tab0, tabLevels)
      certTabs.push({ rawLevel, ratings: parsed.ratings, typeRatings: parsed.typeRatings })
      if (rawLevel) pushUniqueValid(certificateLevels, rawLevel)
      for (const r of parsed.ratings) pushUniqueValid(ratings, r)
      for (const t of parsed.typeRatings) pushUniqueValid(typeRatings, t)
    }
  }

  const pilotParts = certTabs
    .filter((tab) => tab.rawLevel && !isInstructorCertificateLevel(tab.rawLevel))
    .map(formatCertTabLine)
    .filter(Boolean)
  const instructorParts = certTabs
    .filter((tab) => tab.rawLevel && isInstructorCertificateLevel(tab.rawLevel))
    .map(formatCertTabLine)
    .filter(Boolean)

  const formattedLevels = certificateLevels.map(formatRegistryLabel)
  const formattedRatings = ratings.map(formatRegistryLabel)
  const formattedTypeRatings = typeRatings.map(formatTypeRatingCode)

  let residentialAddress: string | undefined
  let residentialCity: string | undefined
  let residentialState: string | undefined
  let residentialZip: string | undefined

  const addressSpans = [...sanitized.matchAll(/<span class="Cert_Info">([\s\S]*?)<\/span>/gi)]
  for (const span of addressSpans) {
    const text = stripHtml(span[1])
    if (!text || /opted-out|medical class|basicmed|authorized experimental/i.test(text)) continue
    if (/\d{5}/.test(text) && text.includes(',')) {
      const parts = text.split(',').map((p) => p.trim())
      if (parts.length >= 2) {
        residentialAddress = parts[0]
        const cityStateZip = parts.slice(1).join(', ')
        const csz = cityStateZip.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/)
        if (csz) {
          residentialCity = csz[1]
          residentialState = csz[2]
          residentialZip = csz[3]
        }
      }
      break
    }
  }

  const medicalMatch = sanitized.match(
    /<b>Medical Class:<\/b>&nbsp;([^&<]+).*?<b>Medical Date:<\/b>&nbsp;([^&<]+)/i
  )

  return {
    name,
    certificates: formatGroupedCertificateBlocks(pilotParts, instructorParts),
    certificateLevels: formattedLevels,
    ratings: formattedRatings,
    typeRatings: formattedTypeRatings,
    residentialAddress: residentialAddress ? formatRegistryLabel(residentialAddress) : undefined,
    residentialCity: residentialCity ? formatRegistryLabel(residentialCity) : undefined,
    residentialState: residentialState?.toUpperCase(),
    residentialZip,
    medicalClass: medicalMatch?.[1] ? formatRegistryLabel(stripHtml(medicalMatch[1])) : undefined,
    medicalDate: medicalMatch?.[2] ? stripHtml(medicalMatch[2]) : undefined,
    source: 'FAA Airmen Inquiry',
  }
}

function buildSearchBody(
  hidden: Record<string, string>,
  input: AirmanRegistrySearchInput
): Record<string, string> {
  const certDigits = input.certificateNumber.replace(/\D/g, '')
  return {
    ...hidden,
    typAirmenInquiry: '3487',
    [FIELD_LAST_NAME]: input.lastName.trim().toUpperCase(),
    [FIELD_CERT_NO]: certDigits,
    ...(input.firstName?.trim() ? { [FIELD_FIRST_NAME]: input.firstName.trim().toUpperCase() } : {}),
    'ctl00$content$ctl01$btnSearch': 'Search',
  }
}

function buildPostbackBody(
  hidden: Record<string, string>,
  preserved: Record<string, string>,
  eventTarget: string
): Record<string, string> {
  return {
    ...hidden,
    __EVENTTARGET: eventTarget,
    __EVENTARGUMENT: '',
    typAirmenInquiry: '3487',
    ...preserved,
  }
}

export async function lookupAirmanFromFaa(
  input: AirmanRegistrySearchInput
): Promise<AirmanRegistryLookupResult> {
  const lastName = input.lastName?.trim()
  const certificateNumber = input.certificateNumber?.trim()

  if (!lastName) {
    return { ok: false, error: 'Last name is required.' }
  }
  if (!certificateNumber) {
    return { ok: false, error: 'Certificate number is required.' }
  }
  if (!/\d/.test(certificateNumber)) {
    return { ok: false, error: 'Certificate number must contain digits.' }
  }

  try {
    const session = new FaaInquirySession()
    const landingHtml = await session.get(FAA_AIRMEN_INQUIRY_URL)
    const hidden = extractHiddenFields(landingHtml)
    let detailHtml = await session.post(FAA_AIRMEN_INQUIRY_URL, buildSearchBody(hidden, input))

    const totals = searchTotalsMessage(detailHtml)
    if (totals?.toLowerCase().includes('no records found')) {
      return {
        ok: false,
        error:
          'No airman found for that name and certificate number. Check that your last name and certificate number match your FAA certificate exactly.',
      }
    }
    if (totals?.toLowerCase().includes('over 50 records')) {
      return {
        ok: false,
        error: 'Too many matches. Add your first name to narrow the search.',
      }
    }

    if (!isDetailPage(detailHtml)) {
      const candidates = extractCandidates(detailHtml)
      const eventTarget = input.eventTarget

      if (candidates.length === 0) {
        const matchCount = totals?.match(/(\d+)\s+based/i)?.[1]
        if (matchCount && Number(matchCount) > 0) {
          return {
            ok: false,
            error:
              'FAA returned a match but Logifi could not read the response. Try again, or add your first name if you have a common last name.',
          }
        }
        return {
          ok: false,
          error:
            'Could not load certificate details from the FAA registry. Verify your last name and certificate number, then try again.',
        }
      }

      if (candidates.length > 1 && !eventTarget) {
        return {
          ok: false,
          code: 'MULTIPLE_MATCHES',
          message: 'Multiple pilots matched. Select the correct person.',
          candidates,
        }
      }

      const target = eventTarget ?? candidates[0]?.eventTarget
      if (!target) {
        return { ok: false, error: 'Could not select an airman record.' }
      }

      const postbackHidden = extractHiddenFields(detailHtml)
      const preserved = extractFormFieldValues(detailHtml)
      detailHtml = await session.post(
        FAA_AIRMEN_INQUIRY_URL,
        buildPostbackBody(postbackHidden, preserved, target)
      )
    }

    const data = parseAirmenDetailHtml(detailHtml)
    if (!data) {
      return {
        ok: false,
        error:
          'Could not parse FAA registry response. Try again, or add your first name if multiple pilots share your last name.',
      }
    }

    return { ok: true, data }
  } catch (error) {
    console.error('FAA airman lookup error:', error)
    return {
      ok: false,
      error: 'Failed to reach the FAA registry. Check your connection and try again.',
    }
  }
}
