import { getFlightAwareEnv } from './flightAwareEnv'
import { flightAwareSearchIdentTiers } from './flightEnrichCandidates'

export interface FlightAwareActuals {
  registration: string | null
  aircraftType: string | null
  actualOutLocal: string | null
  actualInLocal: string | null
  actualOffLocal: string | null
  actualOnLocal: string | null
}

export interface FlightAwareLookupResult {
  actuals: FlightAwareActuals | null
  authRejected: boolean
  rateLimited: boolean
  detail: string | null
  rateLimitResumeMs?: number
}

interface FlightAwareAirport {
  code_iata?: string
  code_icao?: string
}

interface FlightAwareAircraft {
  registration?: string
  type?: string
}

interface FlightAwareFlight {
  fa_flight_id?: string
  ident?: string
  registration?: string
  aircraft_type?: string
  origin?: FlightAwareAirport
  destination?: FlightAwareAirport
  actual_out?: string
  actual_off?: string
  actual_on?: string
  actual_in?: string
  scheduled_out?: string
  scheduled_off?: string
  scheduled_on?: string
  scheduled_in?: string
}

interface FlightAwareResponse {
  flights?: FlightAwareFlight[]
  links?: {
    next?: string
  }
}

interface CachedHttp {
  status: number
  ok: boolean
  data: unknown | null
  retryAfterWaitMs?: number
}

const FA_DEFAULT_MIN_INTERVAL_MS = 200
const RATE_LIMIT_COOLDOWN_MS = 60_000
const DEFAULT_429_RETRY_MS = 3_000

let minIntervalMs = FA_DEFAULT_MIN_INTERVAL_MS
let lastFetchStartedAt = 0
let throttleTail: Promise<void> = Promise.resolve()
let rateLimitedUntilMs = 0
let retryAfterHeaderMs = 0
let enrichStickyPrefix: string | null = null
const urlCache = new Map<string, CachedHttp>()

/** Call at the start of a multi-leg enrich pass (e.g. FLICA fetch). */
export function beginFlightAwareEnrichPass(): void {
  enrichStickyPrefix = null
}

export function getFlightAwareEnrichStickyPrefixForTests(): string | null {
  return enrichStickyPrefix
}

export function resetFlightAwareClientStateForTests(): void {
  lastFetchStartedAt = 0
  throttleTail = Promise.resolve()
  urlCache.clear()
  minIntervalMs = FA_DEFAULT_MIN_INTERVAL_MS
  rateLimitedUntilMs = 0
  retryAfterHeaderMs = 0
  enrichStickyPrefix = null
}

/** AeroAPI `start`/`end` query params expect date-time, not bare YYYY-MM-DD. */
export function flightAwareDateQueryWindow(dateYYYYMMDD: string): {
  start: string
  end: string
} {
  return {
    start: `${dateYYYYMMDD}T00:00:00Z`,
    end: `${dateYYYYMMDD}T23:59:59Z`,
  }
}

function identPrefixFromSearchIdent(searchIdent: string): string | null {
  const m = /^([A-Z]{2,3})(\d+)$/.exec(searchIdent.trim().toUpperCase())
  return m?.[1] ?? null
}

export function clearFlightAwareRateLimitForTests(): void {
  rateLimitedUntilMs = 0
  retryAfterHeaderMs = 0
}

export function setFlightAwareMinIntervalForTests(ms: number): void {
  minIntervalMs = Math.max(0, ms)
}

export function isFlightAwareConfigured(): boolean {
  return Boolean(getFlightAwareEnv().apiKey)
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
  recordOrigin: string | undefined,
  recordDestination: string | undefined,
  legDep?: string,
  legArr?: string
): boolean {
  if (!legDep && !legArr) return true
  const ro = normalizeAirportCode(recordOrigin)
  const rd = normalizeAirportCode(recordDestination)
  const ld = normalizeAirportCode(legDep)
  const la = normalizeAirportCode(legArr)
  if (ld && ro && ld !== ro) return false
  if (la && rd && la !== rd) return false
  return Boolean((ld && ro) || (la && rd))
}

function parseIsoToLocal(iso: string | undefined): string | null {
  if (!iso || typeof iso !== 'string') return null
  const trimmed = iso.trim()
  if (!trimmed || trimmed.length < 10) return null

  const dt = new Date(trimmed)
  if (isNaN(dt.getTime())) return null

  // Use UTC wall clock — Vercel runs in UTC; airport-local TZ would need station data.
  const year = dt.getUTCFullYear()
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  const hours = String(dt.getUTCHours()).padStart(2, '0')
  const minutes = String(dt.getUTCMinutes()).padStart(2, '0')
  const seconds = String(dt.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

export function extractFlightAwareActuals(flight: FlightAwareFlight): FlightAwareActuals {
  return {
    registration: nonEmptyString(flight.registration) || nonEmptyString(flight.aircraft_type),
    aircraftType: nonEmptyString(flight.aircraft_type),
    actualOutLocal: parseIsoToLocal(flight.actual_out),
    actualOffLocal: parseIsoToLocal(flight.actual_off),
    actualOnLocal: parseIsoToLocal(flight.actual_on),
    actualInLocal: parseIsoToLocal(flight.actual_in),
  }
}

export function isUsableFlightAwareHit(actuals: FlightAwareActuals): boolean {
  return Boolean(
    actuals.registration ||
      actuals.actualOutLocal ||
      actuals.actualInLocal ||
      actuals.actualOffLocal ||
      actuals.actualOnLocal
  )
}

function parseFlightAwareResponse(data: unknown): FlightAwareFlight[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj.flights)) {
    return obj.flights.filter((f) => f && typeof f === 'object') as FlightAwareFlight[]
  }
  return []
}

function selectMatchingFlight(
  flights: FlightAwareFlight[],
  depIcao?: string,
  arrIcao?: string
): FlightAwareFlight | null {
  if (!flights.length) return null
  if (flights.length === 1) return flights[0]!

  const dep = depIcao?.trim()
  const arr = arrIcao?.trim()
  if (dep || arr) {
    const matched = flights.filter((f) =>
      airportsMatch(
        f.origin?.code_iata ?? f.origin?.code_icao,
        f.destination?.code_iata ?? f.destination?.code_icao,
        dep,
        arr
      )
    )
    if (matched.length >= 1) return matched[0]!
  }

  return flights[0]!
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterWaitMsFromHeaders(headers: Headers | undefined): number {
  if (!headers) return DEFAULT_429_RETRY_MS
  const retryAfter = headers.get('Retry-After')
  if (!retryAfter) return DEFAULT_429_RETRY_MS
  const seconds = parseInt(retryAfter, 10)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const dateMs = Date.parse(retryAfter)
  if (Number.isFinite(dateMs) && dateMs > Date.now()) return dateMs - Date.now()
  return DEFAULT_429_RETRY_MS
}

function shouldCacheFlightAwareHttp(status: number, data: unknown): boolean {
  if (status === 404 || status === 204) return true
  if (status === 200) return parseFlightAwareResponse(data).length > 0
  return false
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

async function fetchFlightAwareHttp(
  url: string,
  apiKey: string
): Promise<CachedHttp> {
  const cached = urlCache.get(url)
  if (cached) return cached

  await throttleSlot()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
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

    const stored: CachedHttp = {
      status: res.status,
      ok: res.ok,
      data,
      retryAfterWaitMs:
        res.status === 429 ? retryAfterWaitMsFromHeaders(res.headers) : undefined,
    }
    if (shouldCacheFlightAwareHttp(res.status, data)) urlCache.set(url, stored)
    return stored
  } catch {
    return { status: 0, ok: false, data: null }
  }
}

function compactFlightAwareLookupStatus(
  flightNumber: string,
  status: number,
  kind: 'ok' | 'empty' | 'auth' = 'empty'
): string {
  if (kind === 'auth') return `FA-${flightNumber}-${status}a`
  return `FA-${flightNumber}-${status}`
}

interface OnceLookupOutcome {
  actuals: FlightAwareActuals | null
  authRejected: boolean
  rateLimited: boolean
  detail: string | null
  rateLimitResumeMs?: number
  usable: boolean
  status: number
}

async function lookupFlightActualsOnce(
  searchIdent: string,
  date: string,
  depIcao: string | undefined,
  arrIcao: string | undefined,
  apiKey: string,
  apiBase: string
): Promise<OnceLookupOutcome> {
  const { start, end } = flightAwareDateQueryWindow(date)
  const url = `${apiBase}/flights/${encodeURIComponent(searchIdent)}?ident_type=designator&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&max_pages=1`

  let http = await fetchFlightAwareHttp(url, apiKey)

  if (http.status === 429) {
    await wait(http.retryAfterWaitMs ?? DEFAULT_429_RETRY_MS)
    http = await fetchFlightAwareHttp(url, apiKey)
  }

  if (http.status === 401 || http.status === 403) {
    return {
      actuals: null,
      authRejected: true,
      rateLimited: false,
      detail: compactFlightAwareLookupStatus(searchIdent, http.status, 'auth'),
      usable: false,
      status: http.status,
    }
  }
  if (http.status === 429) {
    const retryMs = http.retryAfterWaitMs ?? DEFAULT_429_RETRY_MS
    retryAfterHeaderMs = Date.now() + retryMs
    const cooldownUntilMs = Math.max(Date.now() + RATE_LIMIT_COOLDOWN_MS, retryAfterHeaderMs)
    rateLimitedUntilMs = cooldownUntilMs
    return {
      actuals: null,
      authRejected: false,
      rateLimited: true,
      detail: 'HTTP 429',
      rateLimitResumeMs: cooldownUntilMs,
      usable: false,
      status: http.status,
    }
  }
  if (http.status === 404 || http.status === 204 || http.status >= 500 || !http.ok) {
    return {
      actuals: null,
      authRejected: false,
      rateLimited: false,
      detail: compactFlightAwareLookupStatus(searchIdent, http.status),
      usable: false,
      status: http.status,
    }
  }

  const flights = parseFlightAwareResponse(http.data)
  if (!flights.length) {
    return {
      actuals: null,
      authRejected: false,
      rateLimited: false,
      detail: compactFlightAwareLookupStatus(searchIdent, http.status),
      usable: false,
      status: http.status,
    }
  }

  const match = selectMatchingFlight(flights, depIcao, arrIcao)
  if (!match) {
    return {
      actuals: null,
      authRejected: false,
      rateLimited: false,
      detail: compactFlightAwareLookupStatus(searchIdent, http.status),
      usable: false,
      status: http.status,
    }
  }

  if (depIcao || arrIcao) {
    const origin = match.origin?.code_iata ?? match.origin?.code_icao
    const destination = match.destination?.code_iata ?? match.destination?.code_icao
    if (!airportsMatch(origin, destination, depIcao, arrIcao)) {
      return {
        actuals: null,
        authRejected: false,
        rateLimited: false,
        detail: compactFlightAwareLookupStatus(searchIdent, http.status),
        usable: false,
        status: http.status,
      }
    }
  }

  const actuals = extractFlightAwareActuals(match)
  const usable = isUsableFlightAwareHit(actuals)

  return {
    actuals: usable ? actuals : null,
    authRejected: false,
    rateLimited: false,
    detail: usable
      ? compactFlightAwareLookupStatus(searchIdent, http.status, 'ok')
      : compactFlightAwareLookupStatus(searchIdent, http.status),
    usable,
    status: http.status,
  }
}

export async function lookupFlightActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string,
  airlineCode?: string
): Promise<FlightAwareLookupResult> {
  const num = flightNumber.trim()
  const date = dateYYYYMMDD.trim()
  if (!num || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { actuals: null, authRejected: false, rateLimited: false, detail: null }
  }

  const { apiKey, apiBase } = getFlightAwareEnv()
  if (!apiKey) {
    return { actuals: null, authRejected: false, rateLimited: false, detail: null }
  }

  const cooldownUntilMs = Math.max(rateLimitedUntilMs, retryAfterHeaderMs)
  if (Date.now() < cooldownUntilMs) {
    return {
      actuals: null,
      authRejected: false,
      rateLimited: true,
      detail: 'HTTP 429 cooldown',
      rateLimitResumeMs: cooldownUntilMs,
    }
  }

  const tiers = flightAwareSearchIdentTiers(num, airlineCode, enrichStickyPrefix)
  if (!tiers.length || !tiers.some((t) => t.length)) {
    return { actuals: null, authRejected: false, rateLimited: false, detail: null }
  }

  const statuses: string[] = []

  for (const tier of tiers) {
    for (const searchIdent of tier) {
      const outcome = await lookupFlightActualsOnce(
        searchIdent,
        date,
        depIcao,
        arrIcao,
        apiKey,
        apiBase
      )
      if (outcome.authRejected) {
        return {
          actuals: null,
          authRejected: true,
          rateLimited: false,
          detail: outcome.detail,
        }
      }
      if (outcome.rateLimited) {
        return {
          actuals: null,
          authRejected: false,
          rateLimited: true,
          detail: outcome.detail,
          rateLimitResumeMs: outcome.rateLimitResumeMs,
        }
      }
      if (outcome.usable && outcome.actuals) {
        const prefix = identPrefixFromSearchIdent(searchIdent)
        if (prefix) enrichStickyPrefix = prefix
        statuses.push(
          outcome.detail ?? compactFlightAwareLookupStatus(searchIdent, outcome.status, 'ok')
        )
        return {
          actuals: outcome.actuals,
          authRejected: false,
          rateLimited: false,
          detail: statuses.join(' '),
        }
      }
      if (outcome.detail) statuses.push(outcome.detail)
    }
  }

  return {
    actuals: null,
    authRejected: false,
    rateLimited: false,
    detail: statuses.length ? statuses.join(' ') : null,
  }
}

export async function fetchFlightActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string,
  airlineCode?: string
): Promise<FlightAwareActuals | null> {
  const result = await lookupFlightActuals(
    flightNumber,
    dateYYYYMMDD,
    depIcao,
    arrIcao,
    airlineCode
  )
  return result.actuals
}
