import type { LogEntry } from './logbookTypes'
import { isTrainingDevice, mapCategoryTo8710 } from './form8710Types'
import { getCatalogSimDeviceType } from './simDeviceCatalog'

export type SimDeviceType = 'ffs' | 'ftd' | 'atd'

export interface SimImportHints {
  explicitLogbookType?: 'flight' | 'simulator' | null
  isSimulator?: boolean
  simDeviceType?: SimDeviceType | null
  /** Override inferred device type (e.g. from import preview picker). */
  simTypeOverride?: SimDeviceType | null
  groundSimTime?: number | null
  ffs?: number | null
  ftd?: number | null
  atd?: number | null
  simulatorCellValue?: string
}

function parseDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value).trim())
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null
}

function findFieldValue(rawEntry: Record<string, unknown>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    const direct = rawEntry[name]
    if (direct !== undefined && direct !== null && direct !== '') {
      return String(direct).trim()
    }
    const lowerName = name.toLowerCase()
    for (const key in rawEntry) {
      if (key.toLowerCase() === lowerName) {
        const val = rawEntry[key]
        if (val !== undefined && val !== null && val !== '') {
          return String(val).trim()
        }
      }
    }
  }
  return ''
}

function parseLogbookType(value: string): 'flight' | 'simulator' | null {
  const v = value.trim().toLowerCase()
  if (v === 'simulator' || v === 'sim') return 'simulator'
  if (v === 'flight' || v === 'airplane' || v === 'aircraft') return 'flight'
  return null
}

/** Parse FFS / FTD / ATD tokens from free text (column value, category class, device name). */
export function parseSimDeviceType(text: string): SimDeviceType | null {
  const normalized = (text || '').trim().toUpperCase()
  if (!normalized) return null
  if (/\bFFS\b/.test(normalized) || normalized.includes('FULL FLIGHT SIM')) return 'ffs'
  if (/\bFTD\b/.test(normalized) || normalized.includes('FLIGHT TRAINING DEVICE')) return 'ftd'
  if (/\bATD\b/.test(normalized) || normalized.includes('AVIATION TRAINING DEVICE')) return 'atd'
  return null
}

function readNestedFlightTime(raw: Record<string, unknown>, key: string): number | null {
  const ft = raw.flightTime
  if (ft && typeof ft === 'object' && key in ft) {
    return parseDecimal((ft as Record<string, unknown>)[key])
  }
  return null
}

/** Read simulator-related hints from a CSV/JSON import row. */
export function readSimHintsFromRawRow(raw: Record<string, unknown>): SimImportHints {
  const logbookTypeStr = findFieldValue(raw, [
    'Logbook Type',
    'logbookType',
    'logbook_type',
    'LogbookType',
  ])
  const explicitLogbookType = logbookTypeStr ? parseLogbookType(logbookTypeStr) : null

  const groundSimStr = findFieldValue(raw, [
    'Ground Simulator',
    'groundSimulator',
    'flight_groundSimulator',
    'Simulator Time',
    'simulator time',
  ])

  const ffs =
    parseDecimal(findFieldValue(raw, ['FFS', 'ffs', 'flight_ffs', 'Full Flight Simulator'])) ??
    readNestedFlightTime(raw, 'ffs')
  const ftd =
    parseDecimal(findFieldValue(raw, ['FTD', 'ftd', 'flight_ftd', 'Flight Training Device'])) ??
    readNestedFlightTime(raw, 'ftd')
  const atd =
    parseDecimal(findFieldValue(raw, ['ATD', 'atd', 'flight_atd', 'Aviation Training Device'])) ??
    readNestedFlightTime(raw, 'atd')

  const simulatorCellValue = findFieldValue(raw, ['Simulator', 'simulator', 'SIMULATOR'])

  let simDeviceType: SimDeviceType | null = null
  if (ffs != null && ffs > 0) simDeviceType = 'ffs'
  else if (ftd != null && ftd > 0) simDeviceType = 'ftd'
  else if (atd != null && atd > 0) simDeviceType = 'atd'
  else simDeviceType = parseSimDeviceType(simulatorCellValue)

  const groundSimTime = parseDecimal(groundSimStr)

  const isSimulator =
    explicitLogbookType === 'simulator' ||
    !!simulatorCellValue ||
    (groundSimTime != null && groundSimTime > 0) ||
    (ffs != null && ffs > 0) ||
    (ftd != null && ftd > 0) ||
    (atd != null && atd > 0)

  return {
    explicitLogbookType,
    isSimulator: isSimulator || undefined,
    simDeviceType,
    groundSimTime,
    ffs,
    ftd,
    atd,
    simulatorCellValue: simulatorCellValue || undefined,
  }
}

export function getSimTimeSum(entry: LogEntry): number {
  const ft = entry.flightTime ?? {}
  return (ft.ffs ?? 0) + (ft.ftd ?? 0) + (ft.atd ?? 0)
}

/**
 * Simulator sessions cannot include actual IMC time — merge any actual instrument
 * hours into simulatedInstrument and clear actualInstrument.
 * @returns true when the entry was modified
 */
export function normalizeSimulatorInstrumentTime(entry: LogEntry): boolean {
  if (inferLogbookType(entry) !== 'simulator') return false

  const ft = entry.flightTime
  const actual = ft.actualInstrument ?? 0
  if (actual <= 0) return false

  const simulated = ft.simulatedInstrument ?? 0
  ft.simulatedInstrument = Math.round((simulated + actual) * 10) / 10
  ft.actualInstrument = null
  return true
}

/** Infer logbook type from explicit field or sim vs airplane time breakdown. */
export function inferLogbookType(entry: LogEntry): 'flight' | 'simulator' {
  if (entry.logbookType === 'flight' || entry.logbookType === 'simulator') {
    return entry.logbookType
  }
  const ft = entry.flightTime ?? {}
  const simTime = (ft.ffs ?? 0) + (ft.ftd ?? 0) + (ft.atd ?? 0)
  const airplaneTotal = Math.max(0, (ft.total ?? 0) - simTime)
  return simTime > 0 && airplaneTotal === 0 ? 'simulator' : 'flight'
}

function hasSimBucketTime(entry: LogEntry): boolean {
  const ft = entry.flightTime ?? {}
  return (ft.ffs ?? 0) > 0 || (ft.ftd ?? 0) > 0 || (ft.atd ?? 0) > 0
}

/** True when import hints or partial entry data suggest a simulator row (for registration gate). */
export function isLikelySimulatorRow(
  hints: SimImportHints,
  entry?: Pick<LogEntry, 'aircraftMakeModel' | 'aircraftCategoryClass' | 'trainingElements' | 'flightTime'>
): boolean {
  if (hints.explicitLogbookType === 'simulator') return true
  if (hints.explicitLogbookType === 'flight') return false
  if (hints.isSimulator) return true
  if ((hints.groundSimTime ?? 0) > 0) return true
  if ((hints.ffs ?? 0) > 0 || (hints.ftd ?? 0) > 0 || (hints.atd ?? 0) > 0) return true
  if (entry && hasSimBucketTime(entry as LogEntry)) return true
  if (entry && isTrainingDevice(entry)) return true
  return false
}

function resolveSimDeviceType(
  entry: LogEntry,
  hints?: SimImportHints
): SimDeviceType {
  if (hints?.simTypeOverride) return hints.simTypeOverride
  if (hints?.simDeviceType) return hints.simDeviceType
  if (hints?.simulatorCellValue) {
    const fromCell = parseSimDeviceType(hints.simulatorCellValue)
    if (fromCell) return fromCell
  }
  const fromCategory = parseSimDeviceType(entry.aircraftCategoryClass || '')
  if (fromCategory) return fromCategory
  const from8710 = mapCategoryTo8710(entry.aircraftCategoryClass || '')
  if (from8710 === 'ffs' || from8710 === 'ftd' || from8710 === 'atd') return from8710
  const fromMakeModel = parseSimDeviceType(entry.aircraftMakeModel || '')
  if (fromMakeModel) return fromMakeModel
  const fromCatalog = getCatalogSimDeviceType(entry.aircraftMakeModel || '')
  if (fromCatalog) return fromCatalog.toLowerCase() as SimDeviceType
  return 'atd'
}

function simTypeToCategoryLabel(type: SimDeviceType): string {
  return type.toUpperCase() as 'FFS' | 'FTD' | 'ATD'
}

function applySimBucket(
  entry: LogEntry,
  deviceType: SimDeviceType,
  time: number | null
): void {
  if (time == null || time <= 0) return
  const ft = entry.flightTime
  ft.ffs = deviceType === 'ffs' ? time : (ft.ffs ?? null)
  ft.ftd = deviceType === 'ftd' ? time : (ft.ftd ?? null)
  ft.atd = deviceType === 'atd' ? time : (ft.atd ?? null)
}

function shouldClassifyAsSimulator(entry: LogEntry, hints?: SimImportHints): boolean {
  if (hints?.explicitLogbookType === 'flight') return false
  if (hints?.explicitLogbookType === 'simulator') return true
  if (hints?.isSimulator) return true
  if ((hints?.groundSimTime ?? 0) > 0) return true
  if ((hints?.ffs ?? 0) > 0 || (hints?.ftd ?? 0) > 0 || (hints?.atd ?? 0) > 0) return true
  if (hasSimBucketTime(entry)) return true
  if (isTrainingDevice(entry)) return true
  return false
}

/**
 * Classify and normalize a log entry for simulator import.
 * Moves duration into ffs/ftd/atd and sets logbookType when simulator signals are present.
 */
export function applySimulatorImport(entry: LogEntry, hints?: SimImportHints): LogEntry {
  if (hints?.explicitLogbookType === 'flight') {
    entry.logbookType = 'flight'
    return entry
  }

  if (!shouldClassifyAsSimulator(entry, hints)) {
    entry.logbookType = inferLogbookType(entry)
    normalizeSimulatorInstrumentTime(entry)
    return entry
  }

  entry.logbookType = 'simulator'

  if (hints?.ffs != null && hints.ffs > 0) entry.flightTime.ffs = hints.ffs
  if (hints?.ftd != null && hints.ftd > 0) entry.flightTime.ftd = hints.ftd
  if (hints?.atd != null && hints.atd > 0) entry.flightTime.atd = hints.atd

  if (!hasSimBucketTime(entry)) {
    const deviceType = resolveSimDeviceType(entry, hints)
    const time =
      (hints?.groundSimTime != null && hints.groundSimTime > 0
        ? hints.groundSimTime
        : null) ??
      (entry.flightTime.total != null && entry.flightTime.total > 0
        ? entry.flightTime.total
        : null) ??
      (entry.categoryClassTime != null && entry.categoryClassTime > 0
        ? entry.categoryClassTime
        : null)
    applySimBucket(entry, deviceType, time)

    const cc = (entry.aircraftCategoryClass || '').toUpperCase()
    const label = simTypeToCategoryLabel(deviceType)
    if (!cc || cc === 'FFS' || cc === 'FTD' || cc === 'ATD') {
      entry.aircraftCategoryClass = label
    }
  }

  if (!entry.departure.trim() || entry.departure === 'UNKNOWN') {
    entry.departure = '—'
  }
  if (!entry.destination.trim() || entry.destination === 'UNKNOWN') {
    entry.destination = '—'
  }

  const simTime = getSimTimeSum(entry)
  const roleNorm = (entry.role || '').trim().toLowerCase()
  const dualUnset = entry.flightTime.dual == null || entry.flightTime.dual === 0
  if (simTime > 0 && dualUnset && (roleNorm === 'dual received' || roleNorm === 'student')) {
    entry.flightTime.dual = simTime
  }

  entry.logbookType = inferLogbookType(entry)
  normalizeSimulatorInstrumentTime(entry)
  return entry
}
