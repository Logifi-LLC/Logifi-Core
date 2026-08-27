import { getAeroDataBoxEnv } from './aeroDataBoxEnv'

export interface AeroDataBoxActuals {
  registration: string | null
  aircraftType: string | null
  actualOutLocal: string | null
  actualInLocal: string | null
  actualOffLocal: string | null
  actualOnLocal: string | null
  /** FIDS/gate Out — preview only; never applied as logbook Out. */
  unusedOutLocal: string | null
  /** FIDS/gate In — preview only; never applied as logbook In. */
  unusedInLocal: string | null
}

export interface AeroDataBoxLookupResult {
  actuals: AeroDataBoxActuals | null
  unusedOutLocal: string | null
  unusedInLocal: string | null
  authRejected: boolean
  rateLimited: boolean
  detail: string | null
}

interface AeroAirport {
  iata?: string
  icao?: string
}

interface AeroDateTime {
  local?: string
  utc?: string
}

interface AeroMovement {
  airport?: AeroAirport
  scheduledTimeLocal?: string
  actualTimeLocal?: string
  actualRunwayLocal?: string
  runwayTimeLocal?: string
  estimatedTimeLocal?: string
  scheduledTime?: AeroDateTime
  revisedTime?: AeroDateTime
  actualTime?: AeroDateTime
  runwayTime?: AeroDateTime
  predictedTime?: AeroDateTime
}

interface AeroAircraft {
  reg?: string
  registration?: string
  regNumber?: string
  model?: string
  modelCode?: string
}

interface AeroFlightRecord {
  number?: string
  registration?: string
  departure?: AeroMovement
  arrival?: AeroMovement
  aircraft?: AeroAircraft
}

interface CachedHttp {
  status: number
  ok: boolean
  data: unknown | null
}

/** YX (IATA), RPA (ICAO), then major-airline marketed numbers. */
const RJET_FLIGHT_NUMBER_PREFIXES = ['YX', 'RPA', 'AA', 'UA', 'DL'] as const

const ADB_DEFAULT_MIN_INTERVAL_MS = 1000

let minIntervalMs = ADB_DEFAULT_MIN_INTERVAL_MS
let lastFetchStartedAt = 0
let throttleTail: Promise<void> = Promise.resolve()
let rateLimitedUntilMs = 0
const urlCache = new Map<string, CachedHttp>()

const RATE_LIMIT_COOLDOWN_MS = 60_000

/** Test-only: clear throttle clock, cooldown, and URL cache. */
export function resetAeroDataBoxClientStateForTests(): void {
  lastFetchStartedAt = 0
  throttleTail = Promise.resolve()
  urlCache.clear()
  minIntervalMs = ADB_DEFAULT_MIN_INTERVAL_MS
  rateLimitedUntilMs = 0
}

/** Test-only: allow another lookup after a 429 without clearing the URL cache. */
export function clearAeroDataBoxRateLimitForTests(): void {
  rateLimitedUntilMs = 0
}

/** Test-only: 0 skips the 1 req/s wait so multi-prefix tests stay fast. */
export function setAeroDataBoxMinIntervalForTests(ms: number): void {
  minIntervalMs = Math.max(0, ms)
}

export function isAeroDataBoxConfigured(): boolean {
  return Boolean(getAeroDataBoxEnv().apiKey)
}

/**
 * AeroDataBox search numbers for a schedule flight number.
 * RJET: YX / RPA / AA / UA / DL + digits, then the bare number.
 */
export function aeroDataBoxFlightNumberCandidates(
  flightNumber: string,
  airlineCode?: string
): string[] {
  const raw = flightNumber.trim().toUpperCase().replace(/\s+/g, '')
  if (!raw) return []
  if (/^[A-Z]{2}\d/.test(raw)) return [raw]

  const digits = raw.replace(/^[A-Z]+/, '') || raw
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (code === 'RJET') {
    const out: string[] = []
    for (const prefix of RJET_FLIGHT_NUMBER_PREFIXES) {
      out.push(`${prefix}${digits}`)
    }
    out.push(digits)
    return out
  }
  return [raw]
}

function normalizeAirportCode(code: string | undefined): string {
  if (!code) return ''
  const c = code.trim().toUpperCase()
  if (c.length === 4 && c.startsWith('K') && /^K[A-Z]{3}$/.test(c)) {
    return c.slice(1)
  }
  return c.length === 3 ? c : c
}

function airportsMatch(
  recordDep: string | undefined,
  recordArr: string | undefined,
  legDep?: string,
  legArr?: string
): boolean {
  if (!legDep && !legArr) return true
  const rd = normalizeAirportCode(recordDep)
  const ra = normalizeAirportCode(recordArr)
  const ld = normalizeAirportCode(legDep)
  const la = normalizeAirportCode(legArr)
  if (ld && rd && ld !== rd) return false
  if (la && ra && la !== ra) return false
  return Boolean((ld && rd) || (la && ra))
}

function localTimeFromUnknown(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length >= 10) return value.trim()
  if (value && typeof value === 'object') {
    const local = (value as AeroDateTime).local
    if (typeof local === 'string' && local.trim().length >= 10) return local.trim()
  }
  return null
}

/** Runway Off/On: runwayTime.local → runwayTimeLocal → actualRunwayLocal. */
function pickRunwayLocal(movement: AeroMovement | undefined): string | null {
  if (!movement) return null
  return (
    localTimeFromUnknown(movement.runwayTime) ||
    localTimeFromUnknown(movement.runwayTimeLocal) ||
    localTimeFromUnknown(movement.actualRunwayLocal)
  )
}

/** FIDS/gate times we show in Autofi Sources but never write as Out/In. */
function pickUnusedGateLocal(movement: AeroMovement | undefined): string | null {
  if (!movement) return null
  return (
    localTimeFromUnknown(movement.actualTime) ||
    localTimeFromUnknown(movement.actualTimeLocal) ||
    localTimeFromUnknown(movement.revisedTime)
  )
}

function emptyLookup(
  extras: Partial<AeroDataBoxLookupResult> = {}
): AeroDataBoxLookupResult {
  return {
    actuals: null,
    unusedOutLocal: null,
    unusedInLocal: null,
    authRejected: false,
    rateLimited: false,
    detail: null,
    ...extras,
  }
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

/** Tail + ADS-B runway times only. FIDS revisedTime is not airline gate Out/In. */
export function extractAeroDataBoxActuals(record: AeroFlightRecord): AeroDataBoxActuals {
  const dep = record.departure
  const arr = record.arrival
  const aircraft = record.aircraft

  return {
    registration:
      nonEmptyString(aircraft?.reg) ||
      nonEmptyString(aircraft?.registration) ||
      nonEmptyString(aircraft?.regNumber) ||
      nonEmptyString(record.registration),
    aircraftType:
      nonEmptyString(aircraft?.modelCode) || nonEmptyString(aircraft?.model),
    actualOutLocal: null,
    actualInLocal: null,
    actualOffLocal: pickRunwayLocal(dep),
    actualOnLocal: pickRunwayLocal(arr),
    unusedOutLocal: pickUnusedGateLocal(dep),
    unusedInLocal: pickUnusedGateLocal(arr),
  }
}

export function isUsableAeroDataBoxHit(actuals: AeroDataBoxActuals): boolean {
  return Boolean(
    actuals.registration ||
      actuals.actualOutLocal ||
      actuals.actualInLocal ||
      actuals.actualOffLocal ||
      actuals.actualOnLocal
  )
}

function parseFlightRecords(data: unknown): AeroFlightRecord[] {
  if (Array.isArray(data)) {
    return data.filter((r) => r && typeof r === 'object') as AeroFlightRecord[]
  }
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj.flights)) {
    return obj.flights.filter((r) => r && typeof r === 'object') as AeroFlightRecord[]
  }
  if (obj.departure || obj.arrival || obj.aircraft || obj.number) {
    return [obj as AeroFlightRecord]
  }
  return []
}

function selectMatchingFlight(
  records: AeroFlightRecord[],
  depIcao?: string,
  arrIcao?: string
): AeroFlightRecord | null {
  if (!records.length) return null
  if (records.length === 1) return records[0]

  const dep = depIcao?.trim()
  const arr = arrIcao?.trim()
  if (dep || arr) {
    const matched = records.filter((r) =>
      airportsMatch(
        r.departure?.airport?.iata ?? r.departure?.airport?.icao,
        r.arrival?.airport?.iata ?? r.arrival?.airport?.icao,
        dep,
        arr
      )
    )
    if (matched.length === 1) return matched[0]
    if (matched.length > 1) return matched[0]
  }

  return records[0]
}

interface OnceOutcome {
  searchNumber: string
  status: number
  actuals: AeroDataBoxActuals | null
  usable: boolean
  scheduleOnly: boolean
  authRejected: boolean
  rateLimited: boolean
}

/** Compact status for preview: YX204, AA200, 4442-204. */
export function compactAeroLookupStatus(
  searchNumber: string,
  status: number,
  kind: 'ok' | 'empty' | 'schedule' | 'auth' = 'empty'
): string {
  const m = searchNumber.match(/^([A-Z]{2,3})(\d+)$/)
  const label = m ? m[1] : searchNumber
  const sep = m ? '' : '-'
  if (kind === 'schedule') return `${label}${sep}${status}s`
  if (kind === 'auth') return `${label}${sep}${status}a`
  return `${label}${sep}${status}`
}

function isUsableHitStatusToken(token: string): boolean {
  return token.endsWith('200')
}

function parseLookupTrail(detail: string): { winner: string | null; missTrail: string | null } {
  const tokens = detail.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return { winner: null, missTrail: null }
  const last = tokens[tokens.length - 1]!
  if (isUsableHitStatusToken(last)) {
    const miss = tokens.slice(0, -1).join(' ')
    return { winner: last, missTrail: miss || null }
  }
  return { winner: null, missTrail: tokens.join(' ') }
}

/**
 * Collapse per-leg lookup details for the Fetch banner.
 * Hits: `AA200`, `AA200 after YX204 RPA204`, or `AA200×3 4442-200×2`.
 * Misses: unique miss trails joined with `; `.
 */
export function summarizeAeroLookupDetails(details: string[]): string | null {
  const trimmed = details.map((d) => d.trim()).filter(Boolean)
  if (!trimmed.length) return null

  const parsed = trimmed.map(parseLookupTrail)
  const hits = parsed.filter((p) => p.winner)

  if (hits.length === 0) {
    return [...new Set(trimmed)].join('; ')
  }

  const order: string[] = []
  const counts = new Map<string, number>()
  for (const hit of hits) {
    const winner = hit.winner!
    if (!counts.has(winner)) order.push(winner)
    counts.set(winner, (counts.get(winner) ?? 0) + 1)
  }
  order.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))

  const winnerParts = order
    .map((status) => {
      const n = counts.get(status) ?? 0
      return order.length > 1 ? `${status}×${n}` : status
    })
    .join(' ')

  if (order.length === 1) {
    const trails = new Set(hits.map((h) => h.missTrail ?? ''))
    if (trails.size === 1) {
      const trail = [...trails][0]
      if (trail) return `${winnerParts} after ${trail}`
    }
  }

  return winnerParts
}

function outcomeKind(o: OnceOutcome): 'ok' | 'empty' | 'schedule' | 'auth' {
  if (o.authRejected) return 'auth'
  if (o.usable) return 'ok'
  if (o.scheduleOnly) return 'schedule'
  return 'empty'
}

function candidateUrlVariants(apiHost: string, searchNumber: string, date: string): string[] {
  const encodedNum = encodeURIComponent(searchNumber)
  const base = `https://${apiHost}/flights/number/${encodedNum}`
  return [
    `${base}/${date}?dateLocalRole=Both`,
    `${base}/${date}?dateLocalRole=Departure`,
  ]
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttleSlot(): Promise<void> {
  let release!: () => void
  const mine = new Promise<void>((r) => {
    release = r
  })
  const prev = throttleTail
  throttleTail = prev.then(() => mine)
  await prev
  try {
    const elapsed = lastFetchStartedAt === 0 ? minIntervalMs : Date.now() - lastFetchStartedAt
    const waitMs = Math.max(0, minIntervalMs - elapsed)
    if (waitMs > 0) await wait(waitMs)
    lastFetchStartedAt = Date.now()
  } finally {
    release()
  }
}

async function fetchAdbHttp(
  url: string,
  apiKey: string,
  apiHost: string
): Promise<CachedHttp> {
  const cached = urlCache.get(url)
  if (cached) return cached

  await throttleSlot()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
        Accept: 'application/json',
      },
    })

    let data: unknown = null
    const canParseJson =
      res.status !== 204 &&
      res.status !== 401 &&
      res.status !== 403 &&
      res.status !== 429 &&
      res.status < 500 &&
      res.ok
    if (canParseJson) {
      try {
        data = await res.json()
      } catch {
        data = null
      }
    }

    const stored: CachedHttp = { status: res.status, ok: res.ok, data }
    const cacheable = res.status === 200 || res.status === 204 || res.status === 404
    if (cacheable) urlCache.set(url, stored)
    return stored
  } catch {
    return { status: 0, ok: false, data: null }
  }
}

function emptyOutcome(
  searchNumber: string,
  status: number,
  extra?: { authRejected?: boolean; rateLimited?: boolean }
): OnceOutcome {
  return {
    searchNumber,
    status,
    actuals: null,
    usable: false,
    scheduleOnly: false,
    authRejected: extra?.authRejected === true,
    rateLimited: extra?.rateLimited === true,
  }
}

async function fetchFlightActualsOnce(
  url: string,
  searchNumber: string,
  depIcao: string | undefined,
  arrIcao: string | undefined,
  apiKey: string,
  apiHost: string
): Promise<OnceOutcome> {
  const http = await fetchAdbHttp(url, apiKey, apiHost)

  if (http.status === 401 || http.status === 403) {
    return emptyOutcome(searchNumber, http.status, { authRejected: true })
  }
  if (http.status === 429) {
    return emptyOutcome(searchNumber, http.status, { rateLimited: true })
  }
  if (http.status === 404 || http.status === 204 || http.status >= 500 || !http.ok) {
    return emptyOutcome(searchNumber, http.status)
  }

  const records = parseFlightRecords(http.data)
  if (!records.length) {
    return emptyOutcome(searchNumber, http.status)
  }

  const match = selectMatchingFlight(records, depIcao, arrIcao)
  if (!match) {
    return emptyOutcome(searchNumber, http.status)
  }

  if (depIcao || arrIcao) {
    const dep = match.departure?.airport?.iata ?? match.departure?.airport?.icao
    const arr = match.arrival?.airport?.iata ?? match.arrival?.airport?.icao
    if (!airportsMatch(dep, arr, depIcao, arrIcao)) {
      return emptyOutcome(searchNumber, http.status)
    }
  }

  const actuals = extractAeroDataBoxActuals(match)
  const usable = isUsableAeroDataBoxHit(actuals)
  return {
    searchNumber,
    status: http.status,
    actuals,
    usable,
    scheduleOnly: !usable,
    authRejected: false,
    rateLimited: false,
  }
}

/**
 * Lookup actuals + tail. Never throws. Never logs the API key.
 */
export async function lookupFlightActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string,
  airlineCode?: string
): Promise<AeroDataBoxLookupResult> {
  const num = flightNumber.trim()
  const date = dateYYYYMMDD.trim()
  if (!num || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return emptyLookup()
  }

  const { apiKey, apiHost } = getAeroDataBoxEnv()
  if (!apiKey) {
    return emptyLookup()
  }

  if (Date.now() < rateLimitedUntilMs) {
    return emptyLookup({ rateLimited: true, detail: 'HTTP 429 cooldown' })
  }

  const candidates = aeroDataBoxFlightNumberCandidates(num, airlineCode)
  const statuses: string[] = []
  let lastOutcome: OnceOutcome | null = null

  for (const candidate of candidates) {
    let last: OnceOutcome | null = null
    for (const url of candidateUrlVariants(apiHost, candidate, date)) {
      const outcome = await fetchFlightActualsOnce(
        url,
        candidate,
        depIcao,
        arrIcao,
        apiKey,
        apiHost
      )
      last = outcome
      lastOutcome = outcome
      if (outcome.authRejected) {
        return emptyLookup({
          authRejected: true,
          detail: compactAeroLookupStatus(candidate, outcome.status, 'auth'),
        })
      }
      if (outcome.rateLimited) {
        rateLimitedUntilMs = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return emptyLookup({ rateLimited: true, detail: 'HTTP 429' })
      }
      if (outcome.usable && outcome.actuals) {
        statuses.push(compactAeroLookupStatus(candidate, outcome.status, 'ok'))
        return {
          actuals: outcome.actuals,
          unusedOutLocal: outcome.actuals.unusedOutLocal,
          unusedInLocal: outcome.actuals.unusedInLocal,
          authRejected: false,
          rateLimited: false,
          detail: statuses.join(' '),
        }
      }
      if (outcome.status === 404) break
    }
    if (last) {
      statuses.push(compactAeroLookupStatus(candidate, last.status, outcomeKind(last)))
    }
  }

  return emptyLookup({
    unusedOutLocal: lastOutcome?.actuals?.unusedOutLocal ?? null,
    unusedInLocal: lastOutcome?.actuals?.unusedInLocal ?? null,
    detail: statuses.length ? statuses.join(' ') : null,
  })
}

/**
 * Fetch gate/runway actuals and tail from AeroDataBox by flight number + date.
 * Returns null on missing config, 404, schedule-only hits, rate limits, or no route match — never throws.
 */
export async function fetchFlightActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string,
  airlineCode?: string
): Promise<AeroDataBoxActuals | null> {
  const result = await lookupFlightActuals(
    flightNumber,
    dateYYYYMMDD,
    depIcao,
    arrIcao,
    airlineCode
  )
  return result.actuals
}
