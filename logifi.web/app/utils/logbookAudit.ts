import { canonicalizeAirportCodeForMatch } from '../../shared/airportCodeCanonical'
import { parseOOOITime } from '../../shared/oooiSort'
import { isTrainingDevice } from './form8710Types'
import { getSimTimeSum, inferLogbookType, parseSimDeviceType } from './importSimulator'
import {
  getApproachesFromPerformance,
  getTotalApproachCount,
  type LogEntry,
  type PerformanceMetrics,
} from './logbookTypes'
import { validateCrossCountry, validateDate } from './validation'

const TIME_TOLERANCE = 0.01
/** Longest plausible single OOOI gap (including long-haul airborne). Larger reverse gaps are out of order, not midnight wrap. */
const MAX_OOOI_FORWARD_GAP_MINUTES = 22 * 60

export type AuditSeverity = 'error' | 'check'

export type AuditRuleId =
  | 'sub_time_exceeds_total'
  | 'pic_sic_exceeds_total'
  | 'pic_sic_both_total'
  | 'night_landings_without_night'
  | 'zero_total'
  | 'duplicate_legs'
  | 'sim_as_airplane'
  | 'airplane_on_sim'
  | 'future_date'
  | 'oooi_order'
  | 'xc_same_airport'

export interface AuditFinding {
  id: string
  ruleId: AuditRuleId
  severity: AuditSeverity
  entryId: string
  date: string
  summary: string
  field?: string
}

export interface AuditRuleGroup {
  ruleId: AuditRuleId
  title: string
  severity: AuditSeverity
  count: number
  findings: AuditFinding[]
}

export interface AuditReport {
  findings: AuditFinding[]
  groups: AuditRuleGroup[]
  entryCount: number
  errorCount: number
  checkCount: number
}

export const AUDIT_RULE_META: Record<AuditRuleId, { title: string; severity: AuditSeverity }> = {
  sub_time_exceeds_total: { title: 'Sub-time exceeds total', severity: 'error' },
  pic_sic_exceeds_total: { title: 'PIC + SIC exceed total', severity: 'error' },
  pic_sic_both_total: { title: 'PIC and SIC both equal total', severity: 'check' },
  night_landings_without_night: { title: 'Night landings without night time', severity: 'check' },
  zero_total: { title: 'Total time missing', severity: 'error' },
  duplicate_legs: { title: 'Duplicate legs', severity: 'check' },
  sim_as_airplane: { title: 'Sim time logged as airplane', severity: 'check' },
  airplane_on_sim: { title: 'Airplane time on simulator entry', severity: 'check' },
  future_date: { title: 'Future date', severity: 'error' },
  oooi_order: { title: 'OOOI times out of order', severity: 'error' },
  xc_same_airport: { title: 'Cross-country with same from/to', severity: 'check' },
}

const AUDIT_RULE_ORDER: AuditRuleId[] = [
  'sub_time_exceeds_total',
  'pic_sic_exceeds_total',
  'zero_total',
  'future_date',
  'oooi_order',
  'pic_sic_both_total',
  'night_landings_without_night',
  'duplicate_legs',
  'sim_as_airplane',
  'airplane_on_sim',
  'xc_same_airport',
]

const SUB_TIME_FIELDS: { key: 'pic' | 'sic' | 'night' | 'crossCountry' | 'actualInstrument' | 'simulatedInstrument' | 'dual' | 'solo' | 'dualGiven'; label: string }[] = [
  { key: 'pic', label: 'PIC' },
  { key: 'sic', label: 'SIC' },
  { key: 'night', label: 'Night' },
  { key: 'crossCountry', label: 'XC' },
  { key: 'actualInstrument', label: 'Instrument' },
  { key: 'simulatedInstrument', label: 'Hood' },
  { key: 'dual', label: 'Dual' },
  { key: 'solo', label: 'Solo' },
  { key: 'dualGiven', label: 'Dual given' },
]

function numericValue(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (Number.isNaN(value)) return 0
  return value
}

function roundHoursToTenths(value: number): number {
  return Math.round(value * 10) / 10
}

function isProvided(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !Number.isNaN(value)
}

function exceedsTotal(part: number, total: number): boolean {
  return roundHoursToTenths(part) > roundHoursToTenths(total) + TIME_TOLERANCE
}

function approximatelyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= TIME_TOLERANCE
}

export function isVoidedEntry(entry: Pick<LogEntry, 'isVoid'>): boolean {
  return entry.isVoid === true
}

function finding(
  entry: LogEntry,
  ruleId: AuditRuleId,
  summary: string,
  field?: string
): AuditFinding {
  return {
    id: field ? `${ruleId}:${entry.id}:${field}` : `${ruleId}:${entry.id}`,
    ruleId,
    severity: AUDIT_RULE_META[ruleId].severity,
    entryId: entry.id,
    date: entry.date,
    summary,
    field,
  }
}

function hasAirports(entry: LogEntry): boolean {
  const departure = (entry.departure || '').trim()
  const destination = (entry.destination || '').trim()
  if (!departure || !destination) return false
  if (departure === 'UNKNOWN' || destination === 'UNKNOWN') return false
  if (departure === '—' || destination === '—') return false
  return true
}

function hasOooiTimes(entry: LogEntry): boolean {
  const oooi = entry.oooi
  if (!oooi) return false
  return Boolean(
    (oooi.out && oooi.out.trim()) ||
      (oooi.off && oooi.off.trim()) ||
      (oooi.on && oooi.on.trim()) ||
      (oooi.in && oooi.in.trim())
  )
}

function isSimulatorEntry(entry: LogEntry): boolean {
  return inferLogbookType(entry) === 'simulator' || getSimTimeSum(entry) > 0
}

function hasSimDeviceOrType(entry: LogEntry): boolean {
  if (getSimTimeSum(entry) > 0) return true
  if (parseSimDeviceType(entry.aircraftCategoryClass || '')) return true
  if (parseSimDeviceType(entry.aircraftMakeModel || '')) return true
  return isTrainingDevice(entry)
}

function isSingleCrewRole(role: string | null | undefined): boolean {
  const normalized = (role || '').trim().toUpperCase()
  return normalized === 'PIC' || normalized === 'SIC'
}

function formatHours(value: number | string | null | undefined): string {
  return roundHoursToTenths(numericValue(value)).toFixed(1)
}

/** Any PIC, SIC, night, XC, instrument, dual, solo, dual given, or cat/class time greater than Total. */
export function checkSubTimeExceedsTotal(entry: LogEntry): AuditFinding[] {
  const flightTime = entry.flightTime
  if (!flightTime || !isProvided(flightTime.total)) return []

  const total = numericValue(flightTime.total)
  const findings: AuditFinding[] = []

  for (const field of SUB_TIME_FIELDS) {
    const value = flightTime[field.key]
    if (!isProvided(value)) continue
    const hours = numericValue(value)
    if (!exceedsTotal(hours, total)) continue
    findings.push(
      finding(
        entry,
        'sub_time_exceeds_total',
        `${field.label} ${formatHours(hours)} > Total ${formatHours(total)}`,
        field.key
      )
    )
  }

  if (isProvided(entry.categoryClassTime) && exceedsTotal(numericValue(entry.categoryClassTime), total)) {
    findings.push(
      finding(
        entry,
        'sub_time_exceeds_total',
        `Cat/class ${formatHours(numericValue(entry.categoryClassTime))} > Total ${formatHours(total)}`,
        'categoryClassTime'
      )
    )
  }

  return findings
}

/**
 * PIC + SIC > Total is an error, except PIC and SIC both equal Total on a
 * 2-pilot leg with a single PIC/SIC role — that is a conservative 'check'.
 */
export function checkPicSic(entry: LogEntry): AuditFinding[] {
  const flightTime = entry.flightTime
  if (!flightTime || !isProvided(flightTime.total)) return []
  if (!isProvided(flightTime.pic) && !isProvided(flightTime.sic)) return []

  const total = numericValue(flightTime.total)
  const pic = numericValue(flightTime.pic)
  const sic = numericValue(flightTime.sic)
  if (total <= 0) return []
  if (pic <= 0 && sic <= 0) return []

  const bothEqualTotal =
    approximatelyEqual(pic, total) && approximatelyEqual(sic, total) && pic > 0 && sic > 0

  if (bothEqualTotal && isSingleCrewRole(entry.role)) {
    return [
      finding(
        entry,
        'pic_sic_both_total',
        `PIC and SIC both ${formatHours(total)} on a ${entry.role.trim()} leg`,
        'pic'
      ),
    ]
  }

  if (exceedsTotal(pic + sic, total)) {
    return [
      finding(
        entry,
        'pic_sic_exceeds_total',
        `PIC ${formatHours(pic)} + SIC ${formatHours(sic)} > Total ${formatHours(total)}`,
        'pic'
      ),
    ]
  }

  return []
}

/** Night landings > 0 with Night = 0. Night time without night landings is not flagged. */
export function checkNightLandingsWithoutNight(entry: LogEntry): AuditFinding[] {
  const nightLandings = numericValue(entry.performance?.nightLandings)
  const night = numericValue(entry.flightTime?.night)
  if (nightLandings > 0 && night <= 0) {
    return [
      finding(
        entry,
        'night_landings_without_night',
        `${nightLandings} night landing${nightLandings === 1 ? '' : 's'} with Night = 0`,
        'nightLandings'
      ),
    ]
  }
  return []
}

/** Total = 0 (or blank) on a non-sim entry that still has airports or OOOI times. */
export function checkZeroTotalNonSim(entry: LogEntry): AuditFinding[] {
  if (isSimulatorEntry(entry)) return []
  if (numericValue(entry.flightTime?.total) > 0) return []
  if (!hasAirports(entry) && !hasOooiTimes(entry)) return []
  return [
    finding(entry, 'zero_total', 'Total is 0 on a flight with airports or times', 'total'),
  ]
}

/** Sim device/type with airplane Total/PIC and no sim buckets; airplane PIC/SIC/solo on a sim logbook row. */
export function checkSimAirplaneMix(entry: LogEntry): AuditFinding[] {
  const findings: AuditFinding[] = []
  const simTime = getSimTimeSum(entry)
  const pic = numericValue(entry.flightTime?.pic)
  const sic = numericValue(entry.flightTime?.sic)
  const solo = numericValue(entry.flightTime?.solo)
  const total = numericValue(entry.flightTime?.total)
  const logbookType = inferLogbookType(entry)

  if (logbookType === 'simulator') {
    if (pic > 0 || sic > 0 || solo > 0) {
      findings.push(
        finding(
          entry,
          'airplane_on_sim',
          'Airplane PIC/SIC/solo on a simulator entry',
          pic > 0 ? 'pic' : sic > 0 ? 'sic' : 'solo'
        )
      )
    } else if (total > 0 && (simTime <= 0 || !approximatelyEqual(total, simTime))) {
      findings.push(
        finding(entry, 'airplane_on_sim', 'Airplane Total on a simulator entry', 'total')
      )
    }
    return findings
  }

  // Flight row: sim identity with airplane time but no sim buckets (hours parked in Total/PIC).
  // Airplane + sim buckets on the same flight row is an allowed mixed session — do not flag.
  if (hasSimDeviceOrType(entry) && simTime <= 0 && (total > 0 || pic > 0)) {
    findings.push(
      finding(
        entry,
        'sim_as_airplane',
        'Sim device logged with airplane Total/PIC',
        pic > 0 ? 'pic' : 'total'
      )
    )
  }

  return findings
}

/** Future dates. Reuses validateDate. */
export function checkFutureDate(entry: LogEntry, now?: Date): AuditFinding[] {
  if (now) {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    if (!entry.date) return []
    const entryDate = new Date(entry.date)
    if (Number.isNaN(entryDate.getTime())) return []
    entryDate.setHours(0, 0, 0, 0)
    if (entryDate > today) {
      return [finding(entry, 'future_date', `Date ${entry.date} is in the future`, 'date')]
    }
    return []
  }

  return validateDate(entry)
    .filter((result) => result.type === 'error' && result.field === 'date' && /future/i.test(result.message))
    .map((result) => finding(entry, 'future_date', result.message, 'date'))
}

/** OUT → OFF → ON → IN must be non-decreasing for times that exist. Midnight wrap allowed within 22h. */
export function checkOooiOrder(entry: LogEntry): AuditFinding[] {
  const oooi = entry.oooi
  if (!oooi) return []

  const sequence: { label: string; minutes: number }[] = []
  for (const key of ['out', 'off', 'on', 'in'] as const) {
    const minutes = parseOOOITime(oooi[key])
    if (minutes === null) continue
    sequence.push({ label: key.toUpperCase(), minutes })
  }
  if (sequence.length < 2) return []

  let previous = sequence[0].minutes
  for (let index = 1; index < sequence.length; index += 1) {
    const current = sequence[index]
    if (current.minutes >= previous) {
      previous = current.minutes
      continue
    }
    const wrapped = current.minutes + 1440
    const forwardGap = wrapped - previous
    if (forwardGap > MAX_OOOI_FORWARD_GAP_MINUTES) {
      return [
        finding(
          entry,
          'oooi_order',
          `${sequence[index - 1].label} after ${current.label}`,
          'oooi'
        ),
      ]
    }
    previous = wrapped
  }

  return []
}

function routeTokenMatchesEndpoint(token: string, endpoint: string | null | undefined): boolean {
  const ep = normalizeAirportKey(endpoint)
  if (!ep || ep === 'UNKNOWN' || ep === '—') return false
  const raw = token.trim().toUpperCase()
  if (!raw) return false
  const canon = canonicalizeAirportCodeForMatch(raw)
  if (canon && canon === ep) return true
  return raw === ep
}

/** Route text from `LogEntry.route` (same field as Supabase `route` / dashboard form). */
function getAuditRouteTokens(entry: LogEntry): string[] {
  return (entry.route || '').trim().split(/\s+/).filter(Boolean)
}

/** True when route is empty or every token is only the departure and/or destination. */
export function crossCountryRouteOnlySameEndpoints(entry: LogEntry): boolean {
  const tokens = getAuditRouteTokens(entry)
  if (tokens.length === 0) return true
  return tokens.every(
    (token) =>
      routeTokenMatchesEndpoint(token, entry.departure) ||
      routeTokenMatchesEndpoint(token, entry.destination)
  )
}

/** XC time with the same from/to and no intermediate route tokens. Reuses validateCrossCountry. */
export function checkCrossCountrySameAirport(entry: LogEntry): AuditFinding[] {
  if (isSimulatorEntry(entry)) return []
  const crossCountry = numericValue(entry.flightTime?.crossCountry)
  if (crossCountry <= 0) return []
  if (!crossCountryRouteOnlySameEndpoints(entry)) return []

  return validateCrossCountry(entry)
    .filter((result) => result.field === 'crossCountry' && /same/i.test(result.message))
    .map((result) => finding(entry, 'xc_same_airport', result.message, 'crossCountry'))
}

export function normalizeAuditDateKey(date: string): string {
  const trimmed = (date || '').trim()
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso?.[1]) return iso[1]
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy?.[1] && mdy[2] && mdy[3]) {
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  }
  return trimmed
}

function normalizeAirportKey(code: string | null | undefined): string {
  const raw = (code || '').trim().toUpperCase()
  if (!raw || raw === 'UNKNOWN' || raw === '—') return raw
  return canonicalizeAirportCodeForMatch(raw)
}

function normalizeTailKey(registration: string | null | undefined): string {
  return (registration || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeFlightNumberKey(flightNumber: string | null | undefined): string {
  return (flightNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Bucketing keys for duplicate legs (flight number preferred over tail-only buckets). */
export function duplicateLegKeys(entry: Pick<LogEntry, 'date' | 'departure' | 'destination' | 'registration' | 'flightNumber'>): string[] {
  const date = normalizeAuditDateKey(entry.date)
  const from = normalizeAirportKey(entry.departure)
  const to = normalizeAirportKey(entry.destination)
  const route = `${date}|${from}|${to}`
  const flightNumber = normalizeFlightNumberKey(entry.flightNumber)
  if (flightNumber) return [`${route}|f:${flightNumber}`]
  const tail = normalizeTailKey(entry.registration)
  if (tail) return [`${route}|r:${tail}`]
  return []
}

function comparableTrimmedUpperEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a || '').trim().toUpperCase()
  const right = (b || '').trim().toUpperCase()
  if (!left && !right) return true
  if (!left || !right) return false
  return left === right
}

function comparableRemarksEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
}

function duplicateTimeFieldEqual(
  a: number | string | null | undefined,
  b: number | string | null | undefined
): boolean {
  return approximatelyEqual(numericValue(a), numericValue(b))
}

function flightConditionsKey(conditions: string[] | null | undefined): string {
  return (conditions || [])
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(',')
}

function approachesCountPresent(perf: PerformanceMetrics | null | undefined): boolean {
  return getApproachesFromPerformance(perf).length > 0
}

function approachesCountEqual(
  a: PerformanceMetrics | null | undefined,
  b: PerformanceMetrics | null | undefined
): boolean {
  const presentA = approachesCountPresent(a)
  const presentB = approachesCountPresent(b)
  if (!presentA && !presentB) return true
  if (!presentA || !presentB) return false
  return getTotalApproachCount(a) === getTotalApproachCount(b)
}

function normalizeOooiTimeToken(value: string | null | undefined): string {
  return (value || '').trim().toUpperCase().replace(/:/g, '')
}

function oooiComparableKey(entry: LogEntry): string | null {
  if (!hasOooiTimes(entry)) return null
  const oooi = entry.oooi!
  return [
    `out:${normalizeOooiTimeToken(oooi.out)}`,
    `off:${normalizeOooiTimeToken(oooi.off)}`,
    `on:${normalizeOooiTimeToken(oooi.on)}`,
    `in:${normalizeOooiTimeToken(oooi.in)}`,
    oooi.isZulu ? 'Z' : 'L',
  ].join('|')
}

const DUPLICATE_LEG_TIME_KEYS = [
  'total',
  'pic',
  'sic',
  'dual',
  'dualGiven',
  'night',
  'crossCountry',
  'actualInstrument',
  'simulatedInstrument',
] as const

/**
 * Legs are duplicates only when every comparable field matches (and flight numbers differ → not duplicate).
 */
export function entriesAreDuplicateLegs(a: LogEntry, b: LogEntry): boolean {
  if (normalizeAuditDateKey(a.date) !== normalizeAuditDateKey(b.date)) return false
  if (normalizeAirportKey(a.departure) !== normalizeAirportKey(b.departure)) return false
  if (normalizeAirportKey(a.destination) !== normalizeAirportKey(b.destination)) return false

  const fnA = normalizeFlightNumberKey(a.flightNumber)
  const fnB = normalizeFlightNumberKey(b.flightNumber)
  if (fnA && fnB && fnA !== fnB) return false
  if (fnA !== fnB) return false

  if (!comparableTrimmedUpperEqual(a.route, b.route)) return false

  for (const key of DUPLICATE_LEG_TIME_KEYS) {
    if (!duplicateTimeFieldEqual(a.flightTime?.[key], b.flightTime?.[key])) return false
  }

  if (!duplicateTimeFieldEqual(a.performance?.dayLandings, b.performance?.dayLandings)) return false
  if (!duplicateTimeFieldEqual(a.performance?.nightLandings, b.performance?.nightLandings)) return false
  if (!approachesCountEqual(a.performance, b.performance)) return false

  if (flightConditionsKey(a.flightConditions) !== flightConditionsKey(b.flightConditions)) return false
  if (!comparableRemarksEqual(a.remarks, b.remarks)) return false

  const oooiA = oooiComparableKey(a)
  const oooiB = oooiComparableKey(b)
  if (oooiA && oooiB) {
    if (oooiA !== oooiB) return false
  } else if (oooiA || oooiB) {
    return false
  }

  return true
}

function duplicateLegFinding(entry: LogEntry): AuditFinding {
  const from = (entry.departure || '').trim() || '—'
  const to = (entry.destination || '').trim() || '—'
  return finding(
    entry,
    'duplicate_legs',
    `${entry.date} ${from}→${to} appears more than once`,
    'date'
  )
}

function findDuplicateLegFindings(entries: LogEntry[]): AuditFinding[] {
  const byFlight = new Map<string, LogEntry[]>()
  const byTailNoFlight = new Map<string, LogEntry[]>()
  const flagged = new Set<string>()
  const findings: AuditFinding[] = []

  const flagEntry = (entry: LogEntry): void => {
    if (flagged.has(entry.id)) return
    flagged.add(entry.id)
    findings.push(duplicateLegFinding(entry))
  }

  for (const entry of entries) {
    if (isVoidedEntry(entry)) continue
    const flightNumber = normalizeFlightNumberKey(entry.flightNumber)
    if (flightNumber) {
      const key = duplicateLegKeys(entry)[0]
      if (!key) continue
      const bucket = byFlight.get(key)
      if (bucket) bucket.push(entry)
      else byFlight.set(key, [entry])
      continue
    }
    const tail = normalizeTailKey(entry.registration)
    if (!tail) continue
    const key = duplicateLegKeys(entry)[0]
    if (!key) continue
    const bucket = byTailNoFlight.get(key)
    if (bucket) bucket.push(entry)
    else byTailNoFlight.set(key, [entry])
  }

  for (const group of byFlight.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (!entriesAreDuplicateLegs(group[i], group[j])) continue
        flagEntry(group[i])
        flagEntry(group[j])
      }
    }
  }

  for (const group of byTailNoFlight.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (!entriesAreDuplicateLegs(group[i], group[j])) continue
        flagEntry(group[i])
        flagEntry(group[j])
      }
    }
  }

  return findings
}

/** Duplicate legs when bucketed legs also match on flight content fields. Voided excluded. */
export function checkDuplicateLegs(entries: LogEntry[]): AuditFinding[] {
  return findDuplicateLegFindings(entries)
}

function auditOneEntry(entry: LogEntry, now?: Date): AuditFinding[] {
  return [
    ...checkSubTimeExceedsTotal(entry),
    ...checkPicSic(entry),
    ...checkNightLandingsWithoutNight(entry),
    ...checkZeroTotalNonSim(entry),
    ...checkSimAirplaneMix(entry),
    ...checkFutureDate(entry, now),
    ...checkOooiOrder(entry),
    ...checkCrossCountrySameAirport(entry),
  ]
}

export function groupFindingsByRule(findings: AuditFinding[]): AuditRuleGroup[] {
  const byRule = new Map<AuditRuleId, AuditFinding[]>()
  for (const item of findings) {
    const list = byRule.get(item.ruleId)
    if (list) list.push(item)
    else byRule.set(item.ruleId, [item])
  }

  return AUDIT_RULE_ORDER.flatMap((ruleId) => {
    const ruleFindings = byRule.get(ruleId)
    if (!ruleFindings?.length) return []
    return [
      {
        ruleId,
        title: AUDIT_RULE_META[ruleId].title,
        severity: AUDIT_RULE_META[ruleId].severity,
        count: ruleFindings.length,
        findings: ruleFindings,
      },
    ]
  })
}

/** Single-pass whole-logbook audit. Voided rows are skipped. Duplicate check is a hash map, not N². */
export function auditLogbook(entries: LogEntry[], options?: { now?: Date }): AuditReport {
  const now = options?.now
  const findings: AuditFinding[] = []
  const active: LogEntry[] = []
  let scanned = 0

  for (const entry of entries) {
    if (isVoidedEntry(entry)) continue
    scanned += 1
    active.push(entry)
    const extra = auditOneEntry(entry, now)
    if (extra.length) findings.push(...extra)
  }

  findings.push(...findDuplicateLegFindings(active))

  return {
    findings,
    groups: groupFindingsByRule(findings),
    entryCount: scanned,
    errorCount: findings.filter((item) => item.severity === 'error').length,
    checkCount: findings.filter((item) => item.severity === 'check').length,
  }
}
