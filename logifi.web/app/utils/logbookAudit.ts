import { canonicalizeAirportCodeForMatch } from '../../shared/airportCodeCanonical'
import { parseOOOITime } from '../../shared/oooiSort'
import { isTrainingDevice } from './form8710Types'
import { getSimTimeSum, inferLogbookType, parseSimDeviceType } from './importSimulator'
import type { LogEntry } from './logbookTypes'
import { parseRouteAirportCodes, validateCrossCountry, validateDate } from './validation'

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

function numericValue(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0
  return value
}

function isProvided(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !Number.isNaN(value)
}

function exceedsTotal(part: number, total: number): boolean {
  return part > total + TIME_TOLERANCE
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

function formatHours(value: number): string {
  return value.toFixed(1)
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

/** XC time with the same from/to and no route. Reuses validateCrossCountry. */
export function checkCrossCountrySameAirport(entry: LogEntry): AuditFinding[] {
  if (isSimulatorEntry(entry)) return []
  const crossCountry = numericValue(entry.flightTime?.crossCountry)
  if (crossCountry <= 0) return []
  if (parseRouteAirportCodes(entry.route || '').length > 0) return []

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

/** Hash key for duplicate legs: date + from/to + tail or flight number. */
export function duplicateLegKeys(entry: Pick<LogEntry, 'date' | 'departure' | 'destination' | 'registration' | 'flightNumber'>): string[] {
  const date = normalizeAuditDateKey(entry.date)
  const from = normalizeAirportKey(entry.departure)
  const to = normalizeAirportKey(entry.destination)
  const route = `${date}|${from}|${to}`
  const keys: string[] = []
  const tail = normalizeTailKey(entry.registration)
  const flightNumber = normalizeFlightNumberKey(entry.flightNumber)
  if (tail) keys.push(`${route}|r:${tail}`)
  if (flightNumber) keys.push(`${route}|f:${flightNumber}`)
  return keys
}

/** Same date + from/to + tail (or flight number). Voided rows excluded. O(n) via hash keys. */
export function checkDuplicateLegs(entries: LogEntry[]): AuditFinding[] {
  const buckets = new Map<string, LogEntry[]>()

  for (const entry of entries) {
    if (isVoidedEntry(entry)) continue
    for (const key of duplicateLegKeys(entry)) {
      const bucket = buckets.get(key)
      if (bucket) bucket.push(entry)
      else buckets.set(key, [entry])
    }
  }

  const flagged = new Set<string>()
  const findings: AuditFinding[] = []

  for (const group of buckets.values()) {
    if (group.length < 2) continue
    for (const entry of group) {
      if (flagged.has(entry.id)) continue
      flagged.add(entry.id)
      const from = (entry.departure || '').trim() || '—'
      const to = (entry.destination || '').trim() || '—'
      findings.push(
        finding(
          entry,
          'duplicate_legs',
          `${entry.date} ${from}→${to} appears more than once`,
          'date'
        )
      )
    }
  }

  return findings
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
  const duplicateBuckets = new Map<string, LogEntry[]>()
  let scanned = 0

  for (const entry of entries) {
    if (isVoidedEntry(entry)) continue
    scanned += 1
    const extra = auditOneEntry(entry, now)
    if (extra.length) findings.push(...extra)
    for (const key of duplicateLegKeys(entry)) {
      const bucket = duplicateBuckets.get(key)
      if (bucket) bucket.push(entry)
      else duplicateBuckets.set(key, [entry])
    }
  }

  const flaggedDuplicates = new Set<string>()
  for (const group of duplicateBuckets.values()) {
    if (group.length < 2) continue
    for (const entry of group) {
      if (flaggedDuplicates.has(entry.id)) continue
      flaggedDuplicates.add(entry.id)
      const from = (entry.departure || '').trim() || '—'
      const to = (entry.destination || '').trim() || '—'
      findings.push(
        finding(
          entry,
          'duplicate_legs',
          `${entry.date} ${from}→${to} appears more than once`,
          'date'
        )
      )
    }
  }

  return {
    findings,
    groups: groupFindingsByRule(findings),
    entryCount: scanned,
    errorCount: findings.filter((item) => item.severity === 'error').length,
    checkCount: findings.filter((item) => item.severity === 'check').length,
  }
}
