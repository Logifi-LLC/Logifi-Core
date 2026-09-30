import { DateTime } from 'luxon'
import { getAirportIanaTimezone } from '../../shared/airportTimezone'
import { getFlightAwareEnv } from './flightAwareEnv'
import { flightAwareSearchIdentTiers } from './flightEnrichCandidates'
import {
  flightLookupIsFinal,
  readFlightLookupCache,
  writeFlightLookupCache,
  type FlightLookupCacheRecord,
} from './flightLookupCache'

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

/** Live `/flights` allows start within 10 days. Stay inside 9 so a local-day window cannot trip HTTP 400. */
export const FLIGHTAWARE_LIVE_MAX_AGE_MS = 9 * 24 * 60 * 60 * 1000
/** `/history/flights` rejects a start/end span longer than 7 days. */
export const FLIGHTAWARE_HISTORY_MAX_SPAN_MS = 7 * 24 * 60 * 60 * 1000
/**
 * When the departure timezone is unknown, widen the UTC calendar day enough to
 * cover UTC−12 through UTC+14. The history cap is 7 days; this span is 52 hours.
 */
export const FLIGHTAWARE_UNKNOWN_TZ_PAD_HOURS = 14

export interface FlightAwareQueryTarget {
  /** `flights` or `history/flights`, appended before the ident. */
  resource: 'flights' | 'history/flights'
  start: string
  end: string
}

/** AeroAPI instants are UTC date-times. `end` is exclusive. */
export function formatFlightAwareInstant(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'")
}

/**
 * Inclusive `start` and exclusive `end` for one departure local day.
 * Unknown timezone uses a widened UTC day so a late-evening departure still falls inside.
 */
export function flightAwareDateQueryWindow(
  dateYYYYMMDD: string,
  depAirport?: string
): { start: string; end: string } {
  const zone = depAirport ? getAirportIanaTimezone(depAirport) : null
  if (zone) {
    const start = DateTime.fromISO(dateYYYYMMDD, { zone })
    if (start.isValid) {
      return {
        start: formatFlightAwareInstant(start),
        end: formatFlightAwareInstant(start.plus({ days: 1 })),
      }
    }
  }

  const utcMidnight = DateTime.fromISO(dateYYYYMMDD, { zone: 'utc' })
  if (!utcMidnight.isValid) {
    return {
      start: `${dateYYYYMMDD}T00:00:00Z`,
      end: `${dateYYYYMMDD}T00:00:00Z`,
    }
  }
  return {
    start: formatFlightAwareInstant(utcMidnight.minus({ hours: FLIGHTAWARE_UNKNOWN_TZ_PAD_HOURS })),
    end: formatFlightAwareInstant(
      utcMidnight.plus({ days: 1, hours: FLIGHTAWARE_UNKNOWN_TZ_PAD_HOURS })
    ),
  }
}

/**
 * Live `GET /flights` when the window opens within 9 days; otherwise
 * `GET /history/flights`, with `end` capped at start + 7 days.
 */
export function routeFlightAwareQuery(
  start: string,
  end: string,
  now: DateTime = DateTime.utc()
): FlightAwareQueryTarget {
  const startDt = DateTime.fromISO(start, { zone: 'utc' })
  const endDt = DateTime.fromISO(end, { zone: 'utc' })
  const ageMs = startDt.isValid ? now.toMillis() - startDt.toMillis() : 0
  const useHistory = ageMs > FLIGHTAWARE_LIVE_MAX_AGE_MS
  let cappedEnd = end
  if (useHistory && startDt.isValid && endDt.isValid) {
    const maxEndMs = startDt.toMillis() + FLIGHTAWARE_HISTORY_MAX_SPAN_MS
    if (endDt.toMillis() > maxEndMs) {
      cappedEnd = formatFlightAwareInstant(DateTime.fromMillis(maxEndMs, { zone: 'utc' }))
    }
  }
  return {
    resource: useHistory ? 'history/flights' : 'flights',
    start,
    end: cappedEnd,
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

function airportCodeFromFa(airport?: FlightAwareAirport): string | undefined {
  const iata = airport?.code_iata?.trim()
  const icao = airport?.code_icao?.trim()
  return icao || iata || undefined
}

/** FlightAware actual_* timestamps are UTC; format wall clock at the relevant airport. */
export function parseIsoToAirportLocal(
  iso: string | undefined,
  airportCode: string | undefined
): string | null {
  if (!iso || typeof iso !== 'string') return null
  const trimmed = iso.trim()
  if (!trimmed || trimmed.length < 10) return null

  const parsed = DateTime.fromISO(trimmed, { zone: 'utc' })
  if (!parsed.isValid) return null

  const iana = airportCode ? getAirportIanaTimezone(airportCode) : null
  const local = iana ? parsed.setZone(iana) : parsed
  return local.toFormat('yyyy-MM-dd HH:mm:ss')
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

export function extractFlightAwareActuals(flight: FlightAwareFlight): FlightAwareActuals {
  const dep = airportCodeFromFa(flight.origin)
  const arr = airportCodeFromFa(flight.destination)
  return {
    registration: nonEmptyString(flight.registration),
    aircraftType: nonEmptyString(flight.aircraft_type),
    actualOutLocal: parseIsoToAirportLocal(flight.actual_out, dep),
    actualOffLocal: parseIsoToAirportLocal(flight.actual_off, dep),
    actualOnLocal: parseIsoToAirportLocal(flight.actual_on, arr),
    actualInLocal: parseIsoToAirportLocal(flight.actual_in, arr),
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

/** Local calendar date of scheduled_out (else scheduled_off, else an actual). Null when the zone is unknown. */
function flightDepartureLocalDate(
  flight: FlightAwareFlight,
  depIcao?: string
): string | null {
  const iso =
    nonEmptyString(flight.scheduled_out) ||
    nonEmptyString(flight.scheduled_off) ||
    nonEmptyString(flight.actual_out) ||
    nonEmptyString(flight.actual_off)
  if (!iso) return null
  const parsed = DateTime.fromISO(iso, { zone: 'utc' })
  if (!parsed.isValid) return null
  const origin = airportCodeFromFa(flight.origin) || depIcao
  const zone = origin ? getAirportIanaTimezone(origin) : null
  if (!zone) return null
  return parsed.setZone(zone).toFormat('yyyy-MM-dd')
}

function selectMatchingFlight(
  flights: FlightAwareFlight[],
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string
): FlightAwareFlight | null {
  if (!flights.length) return null

  const dep = depIcao?.trim()
  const arr = arrIcao?.trim()
  const airportFiltered =
    dep || arr
      ? flights.filter((f) =>
          airportsMatch(
            f.origin?.code_iata ?? f.origin?.code_icao,
            f.destination?.code_iata ?? f.destination?.code_icao,
            dep,
            arr
          )
        )
      : flights
  if (!airportFiltered.length) return null

  const dated = airportFiltered.filter(
    (f) => flightDepartureLocalDate(f, depIcao) === dateYYYYMMDD
  )
  if (dated.length) return dated[0]!

  const undated = airportFiltered.filter((f) => flightDepartureLocalDate(f, depIcao) == null)
  if (undated.length) return undated[0]!

  return null
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

function actualsFromCacheRow(
  row: FlightLookupCacheRecord,
  dep: string,
  arr: string
): FlightAwareActuals {
  return {
    registration: row.registration,
    aircraftType: row.aircraftType,
    actualOutLocal: parseIsoToAirportLocal(row.actualOut ?? undefined, dep),
    actualOffLocal: parseIsoToAirportLocal(row.actualOff ?? undefined, dep),
    actualOnLocal: parseIsoToAirportLocal(row.actualOn ?? undefined, arr),
    actualInLocal: parseIsoToAirportLocal(row.actualIn ?? undefined, arr),
  }
}

/** Final cache rows are returned with no AeroAPI call. Non-final rows are not a hit. */
async function readTrustedCacheActuals(
  searchIdent: string,
  date: string,
  depIcao: string | undefined,
  arrIcao: string | undefined
): Promise<FlightAwareActuals | null> {
  const dep = normalizeAirportCode(depIcao)
  const arr = normalizeAirportCode(arrIcao)
  const ident = searchIdent.trim().toUpperCase()
  if (!ident || !dep || !arr) return null
  const row = await readFlightLookupCache({
    ident,
    departureDate: date,
    depAirport: dep,
    arrAirport: arr,
  })
  if (!row || !flightLookupIsFinal(row)) return null
  const actuals = actualsFromCacheRow(row, dep, arr)
  return isUsableFlightAwareHit(actuals) ? actuals : null
}

async function rememberFlightLookup(
  searchIdent: string,
  date: string,
  depIcao: string | undefined,
  arrIcao: string | undefined,
  match: FlightAwareFlight,
  actuals: FlightAwareActuals
): Promise<void> {
  const dep = normalizeAirportCode(depIcao)
  const arr = normalizeAirportCode(arrIcao)
  const ident = searchIdent.trim().toUpperCase()
  if (!ident || !dep || !arr) return
  const record: FlightLookupCacheRecord = {
    ident,
    departureDate: date,
    depAirport: dep,
    arrAirport: arr,
    registration: actuals.registration,
    aircraftType: actuals.aircraftType,
    actualOut: nonEmptyString(match.actual_out),
    actualOff: nonEmptyString(match.actual_off),
    actualOn: nonEmptyString(match.actual_on),
    actualIn: nonEmptyString(match.actual_in),
    scheduledOut: nonEmptyString(match.scheduled_out),
    faFlightId: nonEmptyString(match.fa_flight_id),
    source: 'flightaware',
    fetchedAt: new Date().toISOString(),
    isFinal: false,
  }
  record.isFinal = flightLookupIsFinal(record)
  await writeFlightLookupCache(record)
}

interface OnceLookupOutcome {
  actuals: FlightAwareActuals | null
  authRejected: boolean
  rateLimited: boolean
  detail: string | null
  rateLimitResumeMs?: number
  usable: boolean
  status: number
  /** HTTP 400 (date out of range) ends the leg; do not try the remaining idents. */
  terminal?: boolean
}

async function lookupFlightActualsOnce(
  searchIdent: string,
  date: string,
  depIcao: string | undefined,
  arrIcao: string | undefined,
  apiKey: string,
  apiBase: string
): Promise<OnceLookupOutcome> {
  const queryWindow = flightAwareDateQueryWindow(date, depIcao)
  const target = routeFlightAwareQuery(queryWindow.start, queryWindow.end)
  const url = `${apiBase}/${target.resource}/${encodeURIComponent(searchIdent)}?ident_type=designator&start=${encodeURIComponent(target.start)}&end=${encodeURIComponent(target.end)}&max_pages=1`

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
  if (http.status === 400) {
    return {
      actuals: null,
      authRejected: false,
      rateLimited: false,
      detail: compactFlightAwareLookupStatus(searchIdent, http.status),
      usable: false,
      status: http.status,
      terminal: true,
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

  const match = selectMatchingFlight(flights, date, depIcao, arrIcao)
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
  if (usable) await rememberFlightLookup(searchIdent, date, depIcao, arrIcao, match, actuals)

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

export async function lookupFlightAwareActuals(
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

  const tiers = flightAwareSearchIdentTiers(num, airlineCode, enrichStickyPrefix)
  if (!tiers.length || !tiers.some((t) => t.length)) {
    return { actuals: null, authRejected: false, rateLimited: false, detail: null }
  }

  for (const tier of tiers) {
    for (const searchIdent of tier) {
      const cachedActuals = await readTrustedCacheActuals(searchIdent, date, depIcao, arrIcao)
      if (!cachedActuals) continue
      const prefix = identPrefixFromSearchIdent(searchIdent)
      if (prefix) enrichStickyPrefix = prefix
      return {
        actuals: cachedActuals,
        authRejected: false,
        rateLimited: false,
        detail: `FA-${searchIdent}-cache`,
      }
    }
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
      if (outcome.terminal) {
        if (outcome.detail) statuses.push(outcome.detail)
        return {
          actuals: null,
          authRejected: false,
          rateLimited: false,
          detail: statuses.length ? statuses.join(' ') : null,
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

export async function fetchFlightAwareActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string,
  airlineCode?: string
): Promise<FlightAwareActuals | null> {
  const result = await lookupFlightAwareActuals(
    flightNumber,
    dateYYYYMMDD,
    depIcao,
    arrIcao,
    airlineCode
  )
  return result.actuals
}
