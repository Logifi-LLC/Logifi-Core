import type { LogEntry } from '../../app/utils/logbookTypes'
import { normalizeImportNumber } from './formatters'
import { findFieldValue } from './importMappers'

/** Column names from LogTen Dynamic Export (Tab) airline templates. */
export const LOGTEN_DYNAMIC_EXPORT_HEADERS = [
  'Date',
  'Flight #',
  'Aircraft ID',
  'Aircraft Type',
  'From',
  'To',
  'Out',
  'Off',
  'On',
  'In',
  'Total Time',
  'PIC/P1 Crew',
  'SIC/P2 Crew',
  'Day Ldg',
  'Night Ldg',
  'Day T/O',
  'Night T/O',
  'Actual Inst',
  'Approach 1',
  'Multi-Engine Land',
  'Jet',
  'Pilot Flying',
] as const

function headerSet(headers: string[]): Set<string> {
  return new Set(headers.map((h) => h.toLowerCase().trim()))
}

/** True when headers match the LogTen Dynamic Export (Tab) template. */
export function isLogtenDynamicExportHeaders(headers: string[]): boolean {
  const set = headerSet(headers)
  return (
    set.has('flight #') &&
    set.has('aircraft id') &&
    (set.has('pic/p1 crew') || set.has('sic/p2 crew')) &&
    set.has('multi-engine land')
  )
}

function normalizePersonName(name: string): string {
  return name.trim().toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ')
}

/** Case-insensitive match with last-name, first-initial, and first-name-only tolerance. */
export function namesMatchFlexible(a: string, b: string): boolean {
  const na = normalizePersonName(a)
  const nb = normalizePersonName(b)
  if (!na || !nb) return false
  if (na === nb) return true

  const partsA = na.split(' ')
  const partsB = nb.split(' ')

  if (partsA.length === 1 && partsB.length >= 2 && partsA[0] === partsB[0]) {
    return true
  }
  if (partsB.length === 1 && partsA.length >= 2 && partsB[0] === partsA[0]) {
    return true
  }

  const lastA = partsA[partsA.length - 1]
  const lastB = partsB[partsB.length - 1]
  if (!lastA || !lastB || lastA !== lastB || lastA.length < 3) return false

  const firstA = partsA[0]
  const firstB = partsB[0]
  if (!firstA || !firstB) return false

  return firstA[0] === firstB[0]
}

/** Parse LogTen `Approach 1` values like `1;01;KDCA` or `1;30R;KSTL`. */
export function parseLogtenApproach1(value: string): {
  count: number
  type: string
} | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  const parts = trimmed.split(';').map((p) => p.trim())
  if (parts.length < 2) return null

  const count = normalizeImportNumber(parts[0]) ?? 1
  const type = parts[1] || 'Unknown'
  return { count, type }
}

/**
 * Map non-crew fields from LogTen Dynamic Export (Tab) rows.
 * Call after mapRawRowToLogEntry.
 */
export function enrichLogtenDynamicExportRow(
  entry: LogEntry,
  rawEntry: Record<string, unknown>,
  _pilotName: string
): void {
  const flightNumber = findFieldValue(rawEntry, ['Flight #', 'flight #'])
  if (flightNumber && !entry.flightNumber) {
    entry.flightNumber = flightNumber
  }

  const aircraftType = findFieldValue(rawEntry, ['Aircraft Type', 'aircraft type'])
  if (aircraftType?.trim()) {
    entry.aircraftMakeModel = aircraftType.trim()
  }

  if (!entry.aircraftCategoryClass?.trim()) {
    const melTime = normalizeImportNumber(
      findFieldValue(rawEntry, ['Multi-Engine Land', 'multi-engine land'])
    )
    const jetTime = normalizeImportNumber(findFieldValue(rawEntry, ['Jet', 'jet']))
    if ((melTime ?? 0) > 0 || (jetTime ?? 0) > 0) {
      entry.aircraftCategoryClass = 'AMEL'
    }
  }

  const dayLdg = normalizeImportNumber(findFieldValue(rawEntry, ['Day Ldg', 'day ldg']))
  if (dayLdg !== null && dayLdg > 0) {
    entry.performance.dayLandings = dayLdg
  }

  const nightLdg = normalizeImportNumber(findFieldValue(rawEntry, ['Night Ldg', 'night ldg']))
  if (nightLdg !== null && nightLdg > 0) {
    entry.performance.nightLandings = nightLdg
  }

  const dayTo = normalizeImportNumber(findFieldValue(rawEntry, ['Day T/O', 'day t/o']))
  if (dayTo !== null && dayTo > 0) {
    entry.performance.dayTakeoffs = dayTo
  }

  const nightTo = normalizeImportNumber(findFieldValue(rawEntry, ['Night T/O', 'night t/o']))
  if (nightTo !== null && nightTo > 0) {
    entry.performance.nightTakeoffs = nightTo
  }

  const actualInst = normalizeImportNumber(
    findFieldValue(rawEntry, ['Actual Inst', 'actual inst'])
  )
  if (actualInst !== null && actualInst > 0) {
    entry.flightTime.actualInstrument = actualInst
  }

  const approachRaw = findFieldValue(rawEntry, ['Approach 1', 'approach 1'])
  const parsedApproach = parseLogtenApproach1(approachRaw)
  if (parsedApproach) {
    entry.performance.approachCount = parsedApproach.count
    entry.performance.approachType = parsedApproach.type
    entry.performance.approaches = [
      { type: parsedApproach.type, count: parsedApproach.count },
    ]
  }
}

/**
 * Assign role and PIC/SIC time after total block time is finalized.
 * LogTen Dynamic Export rarely includes separate PIC/SIC hour columns.
 */
export function applyLogtenDynamicRoleAndTime(
  entry: LogEntry,
  rawEntry: Record<string, unknown>,
  pilotName: string
): void {
  const total = entry.flightTime.total
  if (!total || total <= 0) return

  const picCrew = findFieldValue(rawEntry, ['PIC/P1 Crew', 'pic/p1 crew'])
  const sicCrew = findFieldValue(rawEntry, ['SIC/P2 Crew', 'sic/p2 crew'])
  const pilotFlying = findFieldValue(rawEntry, ['Pilot Flying', 'pilot flying'])
  const userName = (pilotName || '').trim()

  const sicTimeFromExport = normalizeImportNumber(
    findFieldValue(rawEntry, ['SIC', 'sic', 'flight_sic'])
  )

  if (userName) {
    if (picCrew && namesMatchFlexible(picCrew, userName)) {
      entry.role = 'PIC'
      entry.flightTime.pic = total
      return
    }
    if (sicCrew && namesMatchFlexible(sicCrew, userName)) {
      entry.role = 'SIC'
      entry.flightTime.sic = total
      return
    }
  }

  if (pilotFlying === '1') {
    entry.role = 'PIC'
    entry.flightTime.pic = total
    return
  }

  if ((sicTimeFromExport ?? 0) > 0) {
    entry.role = 'SIC'
    entry.flightTime.sic = sicTimeFromExport
    return
  }

  // Own-logbook airline export: no profile name or no match — assume PIC seat
  // when listed as PIC/P1 Crew (importer can correct SIC rows in preview).
  if (picCrew) {
    entry.role = 'PIC'
    entry.flightTime.pic = total
  }
}
