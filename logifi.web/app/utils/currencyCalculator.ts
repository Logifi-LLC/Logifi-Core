/**
 * Currency Calculator
 * 14 CFR 61.56 (flight review) and 61.57 (recent flight experience).
 *
 * 61.57(a)/(b) passenger currency is split by category/class and by ICAO type
 * designator. Tailwheel (61.57(a)(1)(ii)) is not split: there is no tailwheel
 * flag on LogEntry or the aircraft catalog. Rules stay inside the cited CFR
 * text; ambiguous edges use the conservative reading and are documented next
 * to the code.
 */

import { DateTime } from 'luxon'
import type {
  LogEntry,
  CurrencyStatus,
  AnnualCurrencyStatus,
  CurrencyStatusType,
  PassengerCurrencyGroup,
} from './logbookTypes'
import { getTotalApproachCount } from './logbookTypes'

/** Structured log-entry tags (not remarks). Canonical labels from the entry form. */
const FLIGHT_REVIEW_TAG = 'flight review'
const IPC_TAG = 'ipc'

function parseEntryDate(entry: LogEntry): DateTime | null {
  const dt = DateTime.fromISO(entry.date)
  return dt.isValid ? dt.startOf('day') : null
}

function refDateTime(referenceDate?: Date): DateTime {
  return (referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now()).startOf('day')
}

/**
 * Last instant of the Nth calendar month after `dt`'s month.
 * N=6 with a January activity → 31 July (14 CFR 61.57(c) current-through).
 * N=24 with a January review → 31 January two years later (14 CFR 61.56(c)).
 */
function endOfNthCalendarMonthAfter(dt: DateTime, n: number): DateTime {
  return dt.startOf('month').plus({ months: n }).endOf('month')
}

function entryHasStructuredTag(entry: LogEntry, tag: string): boolean {
  const want = tag.trim().toLowerCase()
  return (entry.tags ?? []).some((t) => t.trim().toLowerCase() === want)
}

function inInclusiveWindow(entryDate: DateTime, start: DateTime, end: DateTime): boolean {
  return entryDate >= start.startOf('day') && entryDate <= end.endOf('day')
}

function daysRemainingOnOrBefore(expiration: DateTime, ref: DateTime): number {
  return Math.floor(expiration.startOf('day').diff(ref.startOf('day'), 'days').days)
}

function sortNewestFirst(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => {
    const dateA = DateTime.fromISO(a.date)
    const dateB = DateTime.fromISO(b.date)
    return dateB.toMillis() - dateA.toMillis()
  })
}

/**
 * Canonical 61.57 category/class codes. Keys are uppercase exact labels from
 * the entry form (`aircraftCategoryClass`) and the 8710 display strings our
 * own totals already emit. Free-text make/model is never parsed.
 */
const CATEGORY_CLASS_BY_NORMALIZED: Record<string, string> = {
  ASEL: 'ASEL',
  'AIRPLANE SEL': 'ASEL',
  'AIRPLANE-SEL': 'ASEL',
  'AIRPLANE SINGLE ENGINE LAND': 'ASEL',
  AMEL: 'AMEL',
  'AIRPLANE MEL': 'AMEL',
  'AIRPLANE-MEL': 'AMEL',
  'AIRPLANE MULTI ENGINE LAND': 'AMEL',
  ASES: 'ASES',
  'AIRPLANE SES': 'ASES',
  'AIRPLANE-SES': 'ASES',
  'AIRPLANE SINGLE ENGINE SEA': 'ASES',
  AMES: 'AMES',
  'AIRPLANE MES': 'AMES',
  'AIRPLANE-MES': 'AMES',
  'AIRPLANE MULTI ENGINE SEA': 'AMES',
  HELI: 'HELI',
  HELICOPTER: 'HELI',
  'ROTORCRAFT HELICOPTER': 'HELI',
  GYRO: 'GYRO',
  GYROPLANE: 'GYRO',
  'ROTORCRAFT GYROPLANE': 'GYRO',
  GLID: 'GLID',
  GLIDER: 'GLID',
  BAL: 'BAL',
  BALLOON: 'BAL',
  'LTA BALLOON': 'BAL',
  AIRS: 'AIRS',
  AIRSHIP: 'AIRS',
  'LTA AIRSHIP': 'AIRS',
  PL: 'PL',
  'POWERED LIFT': 'PL',
  'WSC-L': 'WSC-L',
  WSCL: 'WSC-L',
  'WSC L': 'WSC-L',
  'WSC-S': 'WSC-S',
  WSCS: 'WSC-S',
  'WSC S': 'WSC-S',
}

const SIM_CATEGORY_CLASS = new Set(['FFS', 'FTD', 'ATD'])

const CATEGORY_CLASS_SORT = [
  'ASEL',
  'AMEL',
  'ASES',
  'AMES',
  'HELI',
  'GYRO',
  'GLID',
  'BAL',
  'AIRS',
  'PL',
  'WSC-L',
  'WSC-S',
  'Unspecified',
]

/**
 * ICAO Doc 8643 type designators are 2–4 alphanumeric characters starting
 * with a letter (E170, B737, C172, PA28). One hyphen is allowed in the stored
 * field (PA-28 → PA28). Anything with a space, slash, or longer token is
 * treated as a make/model string, not a type.
 *
 * 61.57(a)(1)(ii) / (b)(1)(ii) require type only “if a type rating is
 * required.” Log entries have no type-rating-required flag, so a matching
 * designator is tracked as its own type row. That is conservative for
 * non-type-rated airplanes that happen to store C172/PA28 as the type field;
 * class currency still aggregates every airplane in that category/class.
 */
const ICAO_TYPE_DESIGNATOR = /^[A-Z][A-Z0-9]{1,3}$/

export function normalizeCategoryClassForCurrency(value: string | null | undefined): string | null {
  const normalized = (value || '')
    .toUpperCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return null
  if (SIM_CATEGORY_CLASS.has(normalized)) return null
  if (CATEGORY_CLASS_BY_NORMALIZED[normalized]) return CATEGORY_CLASS_BY_NORMALIZED[normalized]
  const hyphenAsSpace = normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  if (CATEGORY_CLASS_BY_NORMALIZED[hyphenAsSpace]) return CATEGORY_CLASS_BY_NORMALIZED[hyphenAsSpace]
  const compact = normalized.replace(/[-\s]/g, '')
  if (CATEGORY_CLASS_BY_NORMALIZED[compact]) return CATEGORY_CLASS_BY_NORMALIZED[compact]
  return null
}

export function icaoTypeDesignatorFromMakeModel(makeModel: string | null | undefined): string | null {
  const trimmed = (makeModel || '').trim().toUpperCase()
  if (!trimmed) return null
  if (/[^A-Z0-9-]/.test(trimmed)) return null
  if ((trimmed.match(/-/g) || []).length > 1) return null
  const compact = trimmed.replace(/-/g, '')
  return ICAO_TYPE_DESIGNATOR.test(compact) ? compact : null
}

/**
 * 61.57(a)/(b) require takeoffs and landings in an aircraft. Structured
 * simulator rows (logbookType or FFS/FTD/ATD category) are excluded.
 * Make/model text is not inspected.
 */
function isPassengerCurrencyAircraftEntry(entry: LogEntry): boolean {
  if (entry.isVoid) return false
  if (entry.logbookType === 'simulator') return false
  const cat = (entry.aircraftCategoryClass || '').toUpperCase().trim()
  if (SIM_CATEGORY_CLASS.has(cat)) return false
  return true
}

/**
 * 14 CFR 61.57(a): 3 takeoffs and 3 landings in the preceding 90 days.
 * Night full-stop landings (and night takeoffs) count; (a) does not require
 * full-stop except for tailwheel airplanes. There is no tailwheel flag on
 * the aircraft model, so tailwheel is not split.
 * Landing counts also increment takeoffs when takeoffs were not logged
 * separately (same heuristic as before: a landing implies a takeoff).
 */
function passengerTakeoffLandingCounts(entry: LogEntry): { takeoffs: number; landings: number } {
  const dayTakeoffs = entry.performance?.dayTakeoffs ?? 0
  const nightTakeoffs = entry.performance?.nightTakeoffs ?? 0
  const dayLandings = entry.performance?.dayLandings ?? 0
  const nightLandings = entry.performance?.nightLandings ?? 0
  return {
    takeoffs: dayTakeoffs + nightTakeoffs + dayLandings + nightLandings,
    landings: dayLandings + nightLandings,
  }
}

/**
 * 14 CFR 61.57(b): 3 night takeoffs and 3 night landings to a full stop.
 * There is no separate full-stop field; logged nightLandings are treated as
 * full-stop (conservative relative to inventing a stop type).
 */
function nightTakeoffLandingCounts(entry: LogEntry): { takeoffs: number; landings: number } {
  const nightTakeoffs = entry.performance?.nightTakeoffs ?? 0
  const nightLandings = entry.performance?.nightLandings ?? 0
  return {
    takeoffs: nightTakeoffs + nightLandings,
    landings: nightLandings,
  }
}

function passengerStatusFromWindow(
  isCurrent: boolean,
  expirationDate: DateTime,
  ref: DateTime
): { status: CurrencyStatusType; daysRemaining: number } {
  const daysRemaining = daysRemainingOnOrBefore(expirationDate, ref)
  if (!isCurrent) return { status: 'expired', daysRemaining: 0 }
  return {
    status: daysRemaining < 30 ? 'expiring_soon' : 'current',
    daysRemaining,
  }
}

function isNightPassengerEntry(entry: LogEntry): boolean {
  const hasNightConditions = entry.flightConditions?.some((c) =>
    c.toLowerCase().includes('night')
  ) ?? false
  const hasNightTime = (entry.flightTime?.night ?? 0) > 0
  const hasNightTakeoffs = (entry.performance?.nightTakeoffs ?? 0) > 0
  const hasNightLandings = (entry.performance?.nightLandings ?? 0) > 0
  return hasNightConditions || hasNightTime || hasNightTakeoffs || hasNightLandings
}

function calculateTakeoffLandingCurrency(
  entries: LogEntry[],
  referenceDate: Date | undefined,
  countsFor: (entry: LogEntry) => { takeoffs: number; landings: number },
  includeEntry: (entry: LogEntry) => boolean
): CurrencyStatus {
  const refDate = refDateTime(referenceDate)
  const ninetyDaysAgo = refDate.minus({ days: 90 })

  const qualifyingEntries = entries.filter((entry) => {
    const entryDate = parseEntryDate(entry)
    if (!entryDate) return false
    if (!inInclusiveWindow(entryDate, ninetyDaysAgo, refDate)) return false
    return includeEntry(entry)
  })

  let takeoffs = 0
  let landings = 0
  qualifyingEntries.forEach((entry) => {
    const counts = countsFor(entry)
    takeoffs += counts.takeoffs
    landings += counts.landings
  })

  const isCurrent = takeoffs >= 3 && landings >= 3

  let expirationDate = ninetyDaysAgo.plus({ days: 90 })
  if (isCurrent && qualifyingEntries.length > 0) {
    const sortedEntries = sortNewestFirst(qualifyingEntries)
    let accumulatedTakeoffs = 0
    let accumulatedLandings = 0
    let oldestContributingEntry: LogEntry | null = null

    for (const entry of sortedEntries) {
      const counts = countsFor(entry)
      if (counts.takeoffs > 0 || counts.landings > 0) {
        oldestContributingEntry = entry
        accumulatedTakeoffs += counts.takeoffs
        accumulatedLandings += counts.landings
        if (accumulatedTakeoffs >= 3 && accumulatedLandings >= 3) break
      }
    }

    if (oldestContributingEntry) {
      const oldestDate = parseEntryDate(oldestContributingEntry)
      if (oldestDate) expirationDate = oldestDate.plus({ days: 90 }).endOf('day')
    }
  }

  const { status, daysRemaining } = passengerStatusFromWindow(isCurrent, expirationDate, refDate)

  return {
    isCurrent,
    daysRemaining,
    expirationDate: expirationDate.toJSDate(),
    status,
    qualifyingEntries,
    takeoffs,
    landings,
  }
}

/**
 * Calculate 90-day passenger currency (14 CFR 61.57(a)).
 * Requires 3 takeoffs and 3 landings within the preceding 90 days to act as
 * PIC carrying passengers. Night takeoffs/landings count toward this total.
 * Pooled across aircraft; use {@link calculatePassengerCurrencyGroups} for
 * 61.57(a)(1)(ii) category/class/type splits.
 */
export function calculatePassengerCurrency(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  return calculateTakeoffLandingCurrency(
    entries,
    referenceDate,
    passengerTakeoffLandingCounts,
    () => true
  )
}

/**
 * Calculate 90-day night passenger currency (14 CFR 61.57(b)).
 * Requires 3 night takeoffs and 3 night landings to a full stop within the
 * preceding 90 days to carry passengers during the period beginning 1 hour
 * after sunset and ending 1 hour before sunrise. Logged nightLandings are
 * treated as full-stop; sunset/sunrise is not computed from airport data.
 * Pooled across aircraft; use {@link calculatePassengerCurrencyGroups} for
 * 61.57(b)(1)(ii) category/class/type splits.
 */
export function calculateNightCurrency(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  return calculateTakeoffLandingCurrency(
    entries,
    referenceDate,
    nightTakeoffLandingCounts,
    isNightPassengerEntry
  )
}

function categoryClassGroupKey(entry: LogEntry): string {
  return normalizeCategoryClassForCurrency(entry.aircraftCategoryClass) ?? 'Unspecified'
}

function sortPassengerCurrencyGroups(groups: PassengerCurrencyGroup[]): PassengerCurrencyGroup[] {
  const classRank = new Map(CATEGORY_CLASS_SORT.map((key, i) => [key, i]))
  return [...groups].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'category_class' ? -1 : 1
    if (a.kind === 'category_class') {
      const ra = classRank.get(a.key) ?? CATEGORY_CLASS_SORT.length
      const rb = classRank.get(b.key) ?? CATEGORY_CLASS_SORT.length
      if (ra !== rb) return ra - rb
    }
    return a.key.localeCompare(b.key)
  })
}

function entriesForPassengerGroup(
  entries: LogEntry[],
  kind: PassengerCurrencyGroup['kind'],
  key: string
): LogEntry[] {
  return entries.filter((entry) => {
    if (!isPassengerCurrencyAircraftEntry(entry)) return false
    if (kind === 'category_class') return categoryClassGroupKey(entry) === key
    return icaoTypeDesignatorFromMakeModel(entry.aircraftMakeModel) === key
  })
}

/**
 * 14 CFR 61.57(a)(1)(ii) / (b)(1)(ii): takeoffs and landings must be in the
 * same category, class, and type (if a type rating is required).
 *
 * Groups:
 * - One category/class row for every aircraft category/class the pilot has
 *   logged (ASEL, AMEL, …). Unrecognized labels become Unspecified rather
 *   than being guessed from make/model.
 * - One type row when `aircraftMakeModel` is clearly an ICAO type designator.
 *   Type landings also count toward that airplane's category/class.
 *
 * Simulator and void rows are omitted. 61.57(a)(1)(ii) tailwheel full-stop
 * is not applied (no tailwheel flag).
 */
export function calculatePassengerCurrencyGroups(
  entries: LogEntry[],
  referenceDate?: Date
): PassengerCurrencyGroup[] {
  const classKeys = new Set<string>()
  const typeKeys = new Set<string>()

  for (const entry of entries) {
    if (!isPassengerCurrencyAircraftEntry(entry)) continue
    const entryDate = parseEntryDate(entry)
    if (!entryDate) continue
    classKeys.add(categoryClassGroupKey(entry))
    const type = icaoTypeDesignatorFromMakeModel(entry.aircraftMakeModel)
    if (type) typeKeys.add(type)
  }

  const groups: PassengerCurrencyGroup[] = []
  for (const key of classKeys) {
    const scoped = entriesForPassengerGroup(entries, 'category_class', key)
    groups.push({
      kind: 'category_class',
      key,
      label: key,
      passenger: calculatePassengerCurrency(scoped, referenceDate),
      night: calculateNightCurrency(scoped, referenceDate),
    })
  }
  for (const key of typeKeys) {
    const scoped = entriesForPassengerGroup(entries, 'type', key)
    groups.push({
      kind: 'type',
      key,
      label: key,
      passenger: calculatePassengerCurrency(scoped, referenceDate),
      night: calculateNightCurrency(scoped, referenceDate),
    })
  }
  return sortPassengerCurrencyGroups(groups)
}

const STATUS_SEVERITY: Record<CurrencyStatusType, number> = {
  expired: 4,
  missing: 3,
  grace_period: 2,
  expiring_soon: 1,
  current: 0,
}

function worseCurrencyStatus(a: CurrencyStatusType, b: CurrencyStatusType): CurrencyStatusType {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b
}

/**
 * Compact-chip summary of 61.57(a) or (b): worst status among category/class
 * groups. Type rows stay in the dashboard breakdown only — we cannot know
 * whether a type rating is required, and treating every C172/PA28 designator
 * as required would expire a GA mixed-type ASEL book incorrectly.
 *
 * Falls back to the pooled result when no category/class group exists.
 */
export function summarizePassengerCurrencyFromGroups(
  groups: PassengerCurrencyGroup[],
  pooled: CurrencyStatus,
  side: 'passenger' | 'night'
): CurrencyStatus {
  const classStatuses = groups
    .filter((group) => group.kind === 'category_class')
    .map((group) => group[side])
  if (classStatuses.length === 0) return pooled

  const allCurrent = classStatuses.every((status) => status.isCurrent)
  const worstStatus = classStatuses.reduce(
    (acc, status) => worseCurrencyStatus(acc, status.status),
    classStatuses[0]!.status
  )

  const representative = allCurrent
    ? classStatuses.reduce((soonest, status) =>
        status.expirationDate.getTime() < soonest.expirationDate.getTime() ? status : soonest
      )
    : classStatuses.find((status) => status.status === worstStatus) ?? classStatuses[0]!

  return {
    ...representative,
    isCurrent: allCurrent,
    status: allCurrent ? representative.status : worstStatus,
    daysRemaining: allCurrent ? representative.daysRemaining : 0,
  }
}

function isInstrumentRelated(entry: LogEntry): boolean {
  const hasInstrumentConditions = entry.flightConditions?.some((c) =>
    c.toLowerCase().includes('ifr') || c.toLowerCase().includes('instrument')
  ) ?? false
  const hasInstrumentTime = ((entry.flightTime?.actualInstrument ?? 0) +
    (entry.flightTime?.simulatedInstrument ?? 0)) > 0
  const hasApproaches = getTotalApproachCount(entry.performance) > 0
  const hasHolding = (entry.performance?.holdingProcedures ?? 0) > 0
  return hasInstrumentConditions || hasInstrumentTime || hasApproaches || hasHolding || entryHasStructuredTag(entry, IPC_TAG)
}

function hasInterceptTrackInText(entry: LogEntry): boolean {
  const remarks = (entry.remarks || '').toLowerCase()
  const training = (entry.trainingElements || '').toLowerCase()
  return remarks.includes('intercept') || remarks.includes('track') ||
    training.includes('intercept') || training.includes('track')
}

function instrumentTaskCounts(entries: LogEntry[]): {
  approaches: number
  holdingProcedures: number
  hasInterceptTrack: boolean
  isMet: boolean
} {
  let approaches = 0
  let holdingProcedures = 0
  entries.forEach((entry) => {
    approaches += getTotalApproachCount(entry.performance)
    holdingProcedures += entry.performance?.holdingProcedures ?? 0
  })
  // 14 CFR 61.57(c)(1)(iii). Six approaches are treated as satisfying intercept/
  // track (each approach intercepts and tracks). Explicit remarks also count.
  const hasInterceptTrack = approaches >= 6 || entries.some(hasInterceptTrackInText)
  return {
    approaches,
    holdingProcedures,
    hasInterceptTrack,
    isMet: approaches >= 6 && holdingProcedures > 0 && hasInterceptTrack,
  }
}

function entriesInWindow(entries: LogEntry[], start: DateTime, end: DateTime): LogEntry[] {
  return entries.filter((entry) => {
    const entryDate = parseEntryDate(entry)
    return entryDate !== null && inInclusiveWindow(entryDate, start, end)
  })
}

/**
 * Oldest entry that supplies approaches toward the 6 required, walking newest-first.
 */
function oldestContributingApproachEntry(entries: LogEntry[]): LogEntry | null {
  const sorted = sortNewestFirst(entries)
  let accumulatedApproaches = 0
  let oldest: LogEntry | null = null
  for (const entry of sorted) {
    const entryApproaches = getTotalApproachCount(entry.performance)
    if (entryApproaches <= 0) continue
    oldest = entry
    accumulatedApproaches += entryApproaches
    if (accumulatedApproaches >= 6) break
  }
  return oldest
}

function ipcEntriesOnOrBefore(entries: LogEntry[], ref: DateTime): LogEntry[] {
  return entries.filter((entry) => {
    const entryDate = parseEntryDate(entry)
    return entryDate !== null && entryDate <= ref && entryHasStructuredTag(entry, IPC_TAG)
  })
}

function ipcCurrentUntil(entries: LogEntry[], ref: DateTime): DateTime | null {
  const ipcs = sortNewestFirst(ipcEntriesOnOrBefore(entries, ref))
  const latest = ipcs[0]
  if (!latest) return null
  const date = parseEntryDate(latest)
  return date ? endOfNthCalendarMonthAfter(date, 6) : null
}

/**
 * 14 CFR 61.57(c) lookback for a flight on `asOf`: first day of the 6th calendar
 * month before `asOf`'s month through `asOf`.
 *
 * Conservative documented choice: current-month tasks through `asOf` count so
 * completing the 6 approaches today restores PIC IFR privilege today. Window
 * *start* is calendar-month aligned (not a rolling 6×30-day clock). Expiration
 * is still the last day of the 6th calendar month after the oldest contributing
 * task's month — not the same calendar day six months later.
 */
function instrumentLookbackStart(asOf: DateTime): DateTime {
  return asOf.startOf('month').minus({ months: 6 }).startOf('day')
}

function experienceCurrentUntilInWindow(entries: LogEntry[], start: DateTime, end: DateTime): DateTime | null {
  const inWindow = entriesInWindow(entries, start, end).filter(isInstrumentRelated)
  const counts = instrumentTaskCounts(inWindow)
  if (!counts.isMet) return null
  const oldestApproach = oldestContributingApproachEntry(inWindow)
  const newestHolding = sortNewestFirst(
    inWindow.filter((entry) => (entry.performance?.holdingProcedures ?? 0) > 0)
  )[0]
  const limitingDates = [oldestApproach, newestHolding]
    .map((entry) => (entry ? parseEntryDate(entry) : null))
    .filter((dt): dt is DateTime => dt !== null)
  if (limitingDates.length === 0) return null
  // Currency ages out with the earlier of the 6-approach cluster and the holding used.
  return endOfNthCalendarMonthAfter(DateTime.min(...limitingDates), 6)
}

/**
 * Most recent date through which 61.57(c) or an IPC (61.57(d)) kept the pilot current.
 */
function lastInstrumentCurrentUntil(entries: LogEntry[], ref: DateTime): DateTime | null {
  const ipcUntil = ipcCurrentUntil(entries, ref)

  const monthKeys = new Set<string>()
  monthKeys.add(ref.toFormat('yyyy-MM'))
  for (const entry of entries) {
    const date = parseEntryDate(entry)
    if (!date || date > ref) continue
    monthKeys.add(date.toFormat('yyyy-MM'))
  }
  const monthsNewestFirst = [...monthKeys].sort((a, b) => b.localeCompare(a))

  let experienceUntil: DateTime | null = null
  for (const key of monthsNewestFirst) {
    const [year, month] = key.split('-').map(Number)
    const monthEnd = DateTime.local(year, month, 1).endOf('month')
    const asOf = monthEnd < ref ? monthEnd : ref
    const until = experienceCurrentUntilInWindow(entries, instrumentLookbackStart(asOf), asOf)
    if (until) {
      experienceUntil = until
      break
    }
  }

  if (ipcUntil && experienceUntil) return DateTime.max(ipcUntil, experienceUntil)
  return ipcUntil ?? experienceUntil
}

/**
 * Calculate instrument currency (14 CFR 61.57(c) and (d)).
 *
 * (c) Six instrument approaches, holding procedures and tasks, and intercepting
 * and tracking courses, within the 6 calendar months preceding the month of the
 * flight. Current through the last day of the 6th calendar month after the
 * month of the oldest contributing task (or IPC).
 *
 * (d) After failing to meet (c), a 6-calendar-month grace period remains in
 * which currency may be regained with a safety pilot or simulator under (c).
 * After that grace period, an IPC is required. Structured `IPC` tags restore
 * currency; remarks are not parsed for IPC.
 */
export function calculateInstrumentCurrency(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  const refDate = refDateTime(referenceDate)
  const windowStart = instrumentLookbackStart(refDate)
  const qualifyingEntries = entriesInWindow(entries, windowStart, refDate).filter(isInstrumentRelated)
  const counts = instrumentTaskCounts(qualifyingEntries)

  const ipcUntil = ipcCurrentUntil(entries, refDate)
  const experienceUntil = experienceCurrentUntilInWindow(entries, windowStart, refDate)
  const currentUntil = ipcUntil && experienceUntil
    ? DateTime.max(ipcUntil, experienceUntil)
    : (ipcUntil ?? experienceUntil)
  const restoredByIpc = !!(ipcUntil && currentUntil && ipcUntil >= (experienceUntil ?? ipcUntil) && ipcUntil.equals(currentUntil))

  if (currentUntil && refDate <= currentUntil) {
    const daysRemaining = daysRemainingOnOrBefore(currentUntil, refDate)
    const monthsRemaining = currentUntil.diff(refDate, 'months').months
    const status: CurrencyStatusType = monthsRemaining < 2 ? 'expiring_soon' : 'current'
    const gracePeriodEndsAt = currentUntil.startOf('month').plus({ months: 6 }).endOf('month')
    return {
      isCurrent: true,
      monthsRemaining,
      daysRemaining,
      expirationDate: currentUntil.toJSDate(),
      status,
      qualifyingEntries,
      approaches: counts.approaches,
      holdingProcedures: counts.holdingProcedures,
      gracePeriodEndsAt: gracePeriodEndsAt.toJSDate(),
      needsIpc: false,
      restoredByIpc,
    }
  }

  const lastUntil = lastInstrumentCurrentUntil(entries, refDate)
  if (lastUntil) {
    const graceUntil = lastUntil.startOf('month').plus({ months: 6 }).endOf('month')
    if (refDate <= graceUntil) {
      return {
        isCurrent: false,
        monthsRemaining: 0,
        daysRemaining: daysRemainingOnOrBefore(graceUntil, refDate),
        expirationDate: graceUntil.toJSDate(),
        status: 'grace_period',
        qualifyingEntries,
        approaches: counts.approaches,
        holdingProcedures: counts.holdingProcedures,
        gracePeriodEndsAt: graceUntil.toJSDate(),
        needsIpc: false,
        restoredByIpc: false,
      }
    }
    return {
      isCurrent: false,
      monthsRemaining: 0,
      daysRemaining: 0,
      expirationDate: graceUntil.toJSDate(),
      status: 'expired',
      qualifyingEntries,
      approaches: counts.approaches,
      holdingProcedures: counts.holdingProcedures,
      gracePeriodEndsAt: graceUntil.toJSDate(),
      needsIpc: true,
      restoredByIpc: false,
    }
  }

  return {
    isCurrent: false,
    monthsRemaining: 0,
    daysRemaining: 0,
    expirationDate: refDate.toJSDate(),
    status: 'expired',
    qualifyingEntries,
    approaches: counts.approaches,
    holdingProcedures: counts.holdingProcedures,
    needsIpc: true,
    restoredByIpc: false,
  }
}

/**
 * Flight review (14 CFR 61.56(c)): no person may act as PIC unless, since the
 * beginning of the 24th calendar month before the month of the flight, that
 * person has accomplished a flight review. Due = last day of the 24th calendar
 * month after the month the review was done.
 *
 * Source: most recent entry with structured tag `Flight Review`. Remarks and
 * endorsements text are not parsed. Checkride / WINGS substitutions in
 * 61.56(d)–(e) are not applied (no reliable mapping beyond the Flight Review tag).
 */
export function calculateFlightReview(
  entries: LogEntry[],
  referenceDate?: Date
): CurrencyStatus {
  const refDate = refDateTime(referenceDate)
  const tagged = entries.filter((entry) => {
    const entryDate = parseEntryDate(entry)
    return entryDate !== null && entryDate <= refDate && entryHasStructuredTag(entry, FLIGHT_REVIEW_TAG)
  })

  if (tagged.length === 0) {
    return {
      isCurrent: false,
      daysRemaining: 0,
      expirationDate: refDate.toJSDate(),
      status: 'missing',
      qualifyingEntries: [],
    }
  }

  const last = sortNewestFirst(tagged)[0]
  const lastDate = parseEntryDate(last)
  if (!lastDate) {
    return {
      isCurrent: false,
      daysRemaining: 0,
      expirationDate: refDate.toJSDate(),
      status: 'missing',
      qualifyingEntries: [],
    }
  }

  const expirationDate = endOfNthCalendarMonthAfter(lastDate, 24)
  const isCurrent = refDate <= expirationDate
  const daysRemaining = isCurrent ? daysRemainingOnOrBefore(expirationDate, refDate) : 0
  let status: CurrencyStatusType = 'expired'
  if (isCurrent) {
    status = daysRemaining < 30 ? 'expiring_soon' : 'current'
  }

  return {
    isCurrent,
    daysRemaining,
    expirationDate: expirationDate.toJSDate(),
    status,
    qualifyingEntries: [last],
  }
}

/**
 * Annual / flight-review wrapper. Flight review is the 61.56 requirement;
 * certificate-specific annuals are not implemented here.
 */
export function calculateAnnualRequirements(
  entries: LogEntry[],
  referenceDate?: Date
): AnnualCurrencyStatus {
  const review = calculateFlightReview(entries, referenceDate)
  return {
    isCurrent: review.isCurrent,
    status: review.status,
    requirements: review.status === 'missing' ? [] : ['Flight review (14 CFR 61.56)'],
    qualifyingEntries: review.qualifyingEntries,
  }
}

/** Short labels for dashboard currency chips. */
export type CurrencyChipKind = 'passenger' | 'night' | 'instrument' | 'flight_review'

const CURRENCY_CHIP_LABELS: Record<CurrencyChipKind, string> = {
  passenger: '90-day',
  night: 'Night',
  instrument: 'IFR',
  flight_review: 'Review',
}

/**
 * Format an expiration date for chip copy: "Apr 12" or "Apr 12, 2027" when not this year.
 */
export function formatCurrencyChipDate(date: Date, referenceDate: Date = new Date()): string {
  const exp = date instanceof Date ? date : new Date(date)
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  const includeYear = exp.getFullYear() !== ref.getFullYear()
  return exp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  })
}

/**
 * Compact chip label for passenger / night / instrument / flight-review currency.
 * Examples: "90-day ✓ until Apr 12", "Night expires in 8 days", "IFR grace until Jan 31"
 */
export function formatCurrencyChip(
  kind: CurrencyChipKind,
  currency: CurrencyStatus | null | undefined,
  referenceDate: Date = new Date()
): string {
  const label = CURRENCY_CHIP_LABELS[kind]
  if (!currency) return `${label} —`

  if (kind === 'flight_review' && currency.status === 'missing') {
    return 'Add your last flight review'
  }

  if (kind === 'instrument' && currency.status === 'grace_period') {
    const until = formatCurrencyChipDate(currency.expirationDate, referenceDate)
    return `IFR grace until ${until}`
  }

  if (kind === 'instrument' && (currency.needsIpc || currency.status === 'expired' || !currency.isCurrent)) {
    return 'IFR expired, needs IPC'
  }

  if (currency.status === 'expired' || !currency.isCurrent) {
    return `${label} expired`
  }

  if (currency.status === 'expiring_soon') {
    const days = currency.daysRemaining ?? 0
    if (days <= 0) return `${label} expires today`
    if (days === 1) return `${label} expires in 1 day`
    return `${label} expires in ${days} days`
  }

  const until = formatCurrencyChipDate(currency.expirationDate, referenceDate)
  return `${label} ✓ until ${until}`
}
