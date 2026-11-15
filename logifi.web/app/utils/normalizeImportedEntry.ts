import type { LogEntry } from '~/utils/logbookTypes'
import type { BridgeSource } from '../../shared/logbookDataBridge/types'
import {
  findFieldValue,
  inferCategoryClassFromAircraftHints,
  mapRawRowToLogEntry,
} from '../../shared/logbookDataBridge/importMappers'
import { parseImportBoolean, parseImportDuration } from '../../shared/logbookDataBridge/formatters'
import {
  applyLogtenDynamicRoleAndTime,
  enrichLogtenDynamicExportRow,
  isLogtenDynamicExportHeaders,
} from '../../shared/logbookDataBridge/logtenDynamicExport'
import { formatOooiTimesForStorage, oooiPairDurationHours } from '../../shared/oooiClock'
import {
  autoCheckFlightConditions,
  sanitizeFlightConditions,
} from '~/utils/flightConditions'
import {
  applySimulatorImport,
  inferLogbookType,
  readSimHintsFromRawRow,
} from '~/utils/importSimulator'
import { applyLogtenCrewFields, applyLogtenFileCrossCountry } from '~/utils/logbookImportEnrichments'
import {
  isLogifiNativeJsonEntry,
  restoreLogifiNativeJsonEntry,
} from '~/utils/restoreLogifiNativeEntry'

export interface NormalizeImportedEntryOptions {
  generateId?: () => string
  importerName?: string
  getAirportTimezone?: (code: string) => Promise<string | null>
}

function nestedOooiString(rawEntry: Record<string, unknown>, key: string): string {
  const oooi = rawEntry.oooi
  if (!oooi || typeof oooi !== 'object' || Array.isArray(oooi)) return ''
  const value = (oooi as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readFlightConditionTokens(rawEntry: Record<string, unknown>): string[] {
  const value = rawEntry['Flight Conditions'] ?? rawEntry.flightConditions
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(';').map((token) => token.trim()).filter(Boolean)
  }
  return []
}

function nestedOooiIsZulu(rawEntry: Record<string, unknown>): unknown {
  const oooi = rawEntry.oooi
  if (!oooi || typeof oooi !== 'object' || Array.isArray(oooi)) return undefined
  return (oooi as Record<string, unknown>).isZulu
}

export function resolveImportedIsZulu(rawEntry: Record<string, unknown>): boolean {
  const explicit = parseImportBoolean(
    rawEntry['Is Zulu'] ?? rawEntry.isZulu ?? rawEntry.is_zulu ?? nestedOooiIsZulu(rawEntry)
  )
  if (explicit != null) return explicit

  const timezoneField = findFieldValue(rawEntry, ['timezone', 'Timezone', 'TIMEZONE'])
  if (timezoneField) {
    const lower = timezoneField.toLowerCase()
    if (lower.includes('local')) return false
    if (lower.includes('zulu') || lower.includes('utc') || lower === 'z') return true
  }

  return true
}

/**
 * Dashboard restore/import path. Native Logifi JSON is taken as-is (validated).
 * CSV keeps an explicit Total instead of recomputing from OOOI.
 */
export async function normalizeImportedEntry(
  rawEntry: Record<string, unknown>,
  source?: BridgeSource,
  options?: NormalizeImportedEntryOptions
): Promise<LogEntry | null> {
  try {
    if (isLogifiNativeJsonEntry(rawEntry)) {
      return restoreLogifiNativeJsonEntry(rawEntry, { generateId: options?.generateId })
    }

    const entry = mapRawRowToLogEntry(rawEntry, {
      generateId: options?.generateId,
      source,
    })
    if (!entry) return null

    const isLogtenDynamic = isLogtenDynamicExportHeaders(Object.keys(rawEntry))
    const importerName = options?.importerName ?? ''

    if (isLogtenDynamic) {
      enrichLogtenDynamicExportRow(entry, rawEntry, importerName)
    }

    if (!entry.aircraftCategoryClass?.trim()) {
      const inferred = inferCategoryClassFromAircraftHints(
        findFieldValue(rawEntry, [
          'aircraftType_type',
          'aircraft_aircraftType',
          'flight_selectedAircraftType',
          'Aircraft Type',
          'aircraft type',
          'Type',
        ]),
        entry.aircraftMakeModel
      )
      if (inferred) entry.aircraftCategoryClass = inferred
    }

    const hasLogtenNativeKeys = !!findFieldValue(rawEntry, [
      'flight_flightDate',
      'flight_flightdate',
    ])
    const hasLogtenOOOI = !!(
      findFieldValue(rawEntry, ['flight_actualDepartureTime']) ||
      findFieldValue(rawEntry, ['flight_actualArrivalTime'])
    )
    const mappedTotal = entry.flightTime.total
    if (hasLogtenOOOI) {
      entry.flightTime.total = null
    }
    const hasExplicitTotal = !hasLogtenOOOI && mappedTotal != null

    const conditionTokens = readFlightConditionTokens(rawEntry)
    if (conditionTokens.length > 0) {
      entry.flightConditions = sanitizeFlightConditions(conditionTokens)
    }

    const logtenOut = findFieldValue(rawEntry, ['flight_actualDepartureTime'])
    const logtenIn = findFieldValue(rawEntry, ['flight_actualArrivalTime'])
    const isLogtenImport = !!(logtenOut || logtenIn || hasLogtenNativeKeys)

    const out =
      logtenOut ||
      findFieldValue(rawEntry, ['Out', 'out']) ||
      nestedOooiString(rawEntry, 'out') ||
      ''

    let off = ''
    let on = ''
    if (isLogtenDynamic) {
      off = findFieldValue(rawEntry, ['Off', 'off'])
      on = findFieldValue(rawEntry, ['On', 'on'])
    } else if (isLogtenImport) {
      off =
        findFieldValue(rawEntry, ['flight_takeoffTime', 'flight_taxiOutTime']) ||
        findFieldValue(rawEntry, ['Off', 'off']) ||
        nestedOooiString(rawEntry, 'off')
      on =
        findFieldValue(rawEntry, ['flight_landingTime', 'flight_taxiInTime']) ||
        findFieldValue(rawEntry, ['On', 'on']) ||
        nestedOooiString(rawEntry, 'on')
    } else {
      off =
        findFieldValue(rawEntry, ['Off', 'off']) || nestedOooiString(rawEntry, 'off')
      on = findFieldValue(rawEntry, ['On', 'on']) || nestedOooiString(rawEntry, 'on')
    }

    const inTime =
      logtenIn ||
      findFieldValue(rawEntry, ['In', 'in']) ||
      nestedOooiString(rawEntry, 'in') ||
      ''

    const isZulu = resolveImportedIsZulu(rawEntry)

    if (!hasExplicitTotal && out && inTime) {
      const startTimezone =
        isZulu || !options?.getAirportTimezone || !entry.departure
          ? null
          : await options.getAirportTimezone(entry.departure)
      const endTimezone =
        isZulu || !options?.getAirportTimezone || !entry.destination
          ? null
          : await options.getAirportTimezone(entry.destination)
      const calculatedTime = oooiPairDurationHours({
        start: out,
        end: inTime,
        date: entry.date,
        startTimezone,
        endTimezone,
        isZulu,
      })
      if (calculatedTime !== null && calculatedTime > 0) {
        entry.flightTime.total = calculatedTime
      }
    } else if (!hasExplicitTotal && off && on) {
      const startTimezone =
        isZulu || !options?.getAirportTimezone || !entry.departure
          ? null
          : await options.getAirportTimezone(entry.departure)
      const endTimezone =
        isZulu || !options?.getAirportTimezone || !entry.destination
          ? null
          : await options.getAirportTimezone(entry.destination)
      const calculatedTime = oooiPairDurationHours({
        start: off,
        end: on,
        date: entry.date,
        startTimezone,
        endTimezone,
        isZulu,
      })
      if (calculatedTime !== null && calculatedTime > 0) {
        entry.flightTime.total = calculatedTime
      }
    }

    if (isLogtenImport && !entry.flightTime.total) {
      const fallbackTotal = parseImportDuration(
        (rawEntry.flight_totalTime as string | number | null | undefined) ?? null
      )
      if (fallbackTotal !== null && fallbackTotal > 0) {
        entry.flightTime.total = fallbackTotal
      }
    }

    if (isLogtenImport) {
      applyLogtenFileCrossCountry(entry, rawEntry.flight_crossCountry)
    }

    if (out || off || on || inTime) {
      entry.oooi = formatOooiTimesForStorage({
        out: out || null,
        off: off || null,
        on: on || null,
        in: inTime || null,
        isZulu,
      })
    }

    const isNativeCsv = source === 'logifi-native'
    if (!isNativeCsv && entry.flightNumber && entry.flightNumber.trim() !== '') {
      const conditionSet = new Set(entry.flightConditions)
      conditionSet.add('ifr')
      entry.flightConditions = Array.from(conditionSet)
    }

    if (isLogtenDynamic) {
      applyLogtenDynamicRoleAndTime(entry, rawEntry, importerName)
    }

    if (source === 'logten' || isLogtenImport || isLogtenDynamic) {
      applyLogtenCrewFields(entry, rawEntry, importerName)
    }

    const simHints = readSimHintsFromRawRow(rawEntry)
    applySimulatorImport(entry, simHints)
    entry.logbookType = inferLogbookType(entry)

    if (!isNativeCsv) {
      entry.flightConditions = autoCheckFlightConditions(
        entry.flightConditions,
        entry.flightTime.night,
        entry.flightTime.actualInstrument,
        entry.flightTime.simulatedInstrument,
        entry.flightTime.crossCountry,
        entry.flightTime.nvg ?? null
      )
    }

    return entry
  } catch (error) {
    console.error('Error normalizing imported entry:', error, rawEntry)
    return null
  }
}
