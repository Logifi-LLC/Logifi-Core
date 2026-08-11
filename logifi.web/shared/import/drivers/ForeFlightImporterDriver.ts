import {
  findFieldValue,
  FOREFLIGHT_MISSING_TAIL,
  inferCategoryClassFromAircraftHints,
  normalizeCategoryClassLabel,
} from '../../logbookDataBridge/importMappers'
import {
  formatRegistrationForExport,
  normalizeImportNumber,
} from '../../logbookDataBridge/formatters'
import type { LogEntry } from '../../../app/utils/logbookTypes'
import { createBridgeBackedImporter } from './baseDriver'
import type { ProviderImporter } from '../types'

const FAA_FLAG_TAGS: { names: string[]; tag: string }[] = [
  { names: ['Flight Review (FAA)'], tag: 'Flight Review' },
  { names: ['IPC (FAA)'], tag: 'IPC' },
  { names: ['Checkride (FAA)'], tag: 'Checkride' },
]

/**
 * ForeFlight CSV: Aircraft Table + Flights Table in one file.
 *
 * WHY: ForeFlight exports omit Make/Model/Category on flight rows; those live in
 * the Aircraft Table keyed by AircraftID. Joining restores type/class for Part 61.
 *
 * HOW: After base map, index aircraft rows by AircraftID and fill blank
 * aircraftMakeModel / aircraftCategoryClass. Also map DayTakeoffs / NightTakeoffs
 * when present (Logifi performance metrics).
 */
export function enrichForeFlightEntries(
  entries: LogEntry[],
  rawRows: Record<string, string>[],
  ctx: { aircraftRows?: Record<string, string>[]; headers?: string[] }
): string[] {
  const warnings: string[] = []
  const aircraftById = new Map<string, Record<string, string>>()

  for (const row of ctx.aircraftRows ?? []) {
    const id = findFieldValue(row, ['AircraftID', 'Aircraft ID', 'aircraftid'])
    indexAircraftRow(aircraftById, id, row)
  }

  const customHourTagsUsed = new Set<string>()
  let noTailCount = 0
  let defaultedClassCount = 0

  entries.forEach((entry, index) => {
    const raw = rawRows[index]
    if (!raw) return

    if (entry.registration.toUpperCase() === FOREFLIGHT_MISSING_TAIL) {
      noTailCount++
    }

    const aircraft =
      aircraftById.get(entry.registration.toUpperCase()) ||
      aircraftById.get(formatRegistrationForExport(entry.registration))
    if (aircraft) {
      // WHY: Flight rows often only carry AircraftID; type lives in the hangar table.
      const typeCode = findFieldValue(aircraft, ['TypeCode', 'Type Code', 'typecode'])
      if (!entry.aircraftMakeModel?.trim()) {
        const make = findFieldValue(aircraft, ['Make', 'make'])
        const model = findFieldValue(aircraft, ['Model', 'model'])
        const combined = [make, model].filter(Boolean).join(' ').trim()
        entry.aircraftMakeModel = combined || typeCode
      }
      if (!entry.aircraftCategoryClass?.trim()) {
        const cat = findFieldValue(aircraft, [
          'Category / Class',
          'Category/Class',
          'Category',
          'aircraftClass (FAA)',
          'aircraftClass(FAA)',
        ])
        const fromFaa = normalizeCategoryClassLabel(cat)
        const inferred = inferCategoryClassFromAircraftHints(
          typeCode,
          entry.aircraftMakeModel
        )
        entry.aircraftCategoryClass = canonicalCategoryClass(fromFaa) || inferred
      }
    }

    if (!entry.aircraftCategoryClass?.trim()) {
      const inferred = inferCategoryClassFromAircraftHints('', entry.aircraftMakeModel)
      if (inferred) {
        entry.aircraftCategoryClass = inferred
      } else {
        entry.aircraftCategoryClass = 'ASEL'
        defaultedClassCount++
      }
    }

    // HOW: ForeFlight takeoff counters → Logifi performance (landings already mapped).
    const dayTo = normalizeImportNumber(
      findFieldValue(raw, ['DayTakeoffs', 'Day Takeoffs', 'daytakeoffs'])
    )
    const nightTo = normalizeImportNumber(
      findFieldValue(raw, ['NightTakeoffs', 'Night Takeoffs', 'nighttakeoffs'])
    )
    if (dayTo != null) entry.performance.dayTakeoffs = dayTo
    if (nightTo != null) entry.performance.nightTakeoffs = nightTo

    // HOW: OOOI from ForeFlight TimeOut/TimeOff/TimeOn/TimeIn when not already set.
    const timeOut = findFieldValue(raw, ['TimeOut', 'Timeout', 'Time Out'])
    const timeOff = findFieldValue(raw, ['TimeOff', 'Timeoff', 'Time Off'])
    const timeOn = findFieldValue(raw, ['TimeOn', 'Timeon', 'Time On'])
    const timeIn = findFieldValue(raw, ['TimeIn', 'Timein', 'Time In'])
    if (timeOut || timeOff || timeOn || timeIn) {
      entry.oooi = {
        out: normalizeHhmm(timeOut),
        off: normalizeHhmm(timeOff),
        on: normalizeHhmm(timeOn),
        in: normalizeHhmm(timeIn),
        isZulu: false,
      }
    }

    applyFaaMilestoneTags(entry, raw)
    applyCustomHourTags(entry, raw, ctx.headers, customHourTagsUsed)
  })

  if ((ctx.aircraftRows?.length ?? 0) > 0) {
    warnings.push(
      `Joined ${ctx.aircraftRows!.length} ForeFlight aircraft profile(s) onto flight rows.`
    )
  }

  if (noTailCount > 0) {
    warnings.push(
      `${noTailCount} flight(s) had no AircraftID; imported as ${FOREFLIGHT_MISSING_TAIL}.`
    )
  }

  if (customHourTagsUsed.size > 0) {
    warnings.push(
      `Tagged custom hour field(s) on flights with time > 0: ${[...customHourTagsUsed].join(', ')}.`
    )
  }

  if (defaultedClassCount > 0) {
    warnings.push(
      `${defaultedClassCount} flight(s) had no category/class; defaulted to ASEL.`
    )
  }

  return warnings
}

const CANONICAL_CATEGORY_CLASS = new Set([
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
])

function canonicalCategoryClass(value: string): string {
  const normalized = (value || '').trim().toUpperCase()
  return CANONICAL_CATEGORY_CLASS.has(normalized) ? normalized : ''
}

function indexAircraftRow(
  map: Map<string, Record<string, string>>,
  id: string,
  row: Record<string, string>
): void {
  const raw = id.trim()
  if (!raw) return
  const upper = raw.toUpperCase()
  map.set(upper, row)
  const formatted = formatRegistrationForExport(raw)
  if (formatted) map.set(formatted, row)
  if (/no\s*tail/i.test(raw)) {
    map.set(FOREFLIGHT_MISSING_TAIL, row)
  }
}

function applyFaaMilestoneTags(entry: LogEntry, raw: Record<string, string>): void {
  for (const { names, tag } of FAA_FLAG_TAGS) {
    const value = findFieldValue(raw, names)
    if (isTruthyFlag(value)) appendUniqueTag(entry, tag)
  }
}

function applyCustomHourTags(
  entry: LogEntry,
  raw: Record<string, string>,
  headers: string[] | undefined,
  usedLabels: Set<string>
): void {
  const headerSet = new Set<string>()
  for (const header of headers ?? []) {
    if (header) headerSet.add(header)
  }
  for (const key of Object.keys(raw)) {
    headerSet.add(key)
  }

  for (const header of headerSet) {
    if (!/^\[Hours\]/i.test(header.trim())) continue
    const hours = normalizeImportNumber(findFieldValue(raw, [header]) || raw[header])
    if (hours == null || hours <= 0) continue
    const label = customHourTagLabel(header)
    if (!label) continue
    appendUniqueTag(entry, label)
    usedLabels.add(label)
  }
}

function customHourTagLabel(header: string): string {
  return header
    .replace(/^\[Hours\]/i, '')
    .replace(/\s*Time\s*$/i, '')
    .trim()
}

function isTruthyFlag(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'x'
}

function appendUniqueTag(entry: LogEntry, tag: string): void {
  const tags = entry.tags ?? (entry.tags = [])
  if (!tags.includes(tag)) tags.push(tag)
}

/** Normalize ForeFlight 24h clock strings (e.g. 1823 or 18:23) to HHMM digits. */
function normalizeHhmm(value: string): string | null {
  if (!value?.trim()) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 3 || digits.length > 4) return value.trim()
  return digits.padStart(4, '0')
}

export const ForeFlightImporterDriver: ProviderImporter = createBridgeBackedImporter({
  provider: 'foreflight',
  bridgeSource: 'foreflight',
  enrich: enrichForeFlightEntries,
})
