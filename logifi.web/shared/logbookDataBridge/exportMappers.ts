import {
  buildForeFlightRouteIntermediate,
  buildFullRoute,
  formatAirportCode,
  formatDecimalHours,
  formatExportDate,
  formatLogifiNativeDate,
  formatRegistrationForExport,
  formatWholeNumber,
  splitMakeModel,
} from './formatters'
import type { LogEntry } from '../../app/utils/logbookTypes'
import {
  getApproachesFromPerformance,
  getTotalApproachCount,
} from '../../app/utils/logbookTypes'

export const FOREFLIGHT_AIRCRAFT_HEADERS = [
  'AircraftID',
  'EquipmentType',
  'TypeCode',
  'Year',
  'Make',
  'Model',
  'GearType',
  'EngineType',
  'Category / Class',
  'Complex',
  'HighPerformance',
  'Pressurized',
  'TAA',
] as const

export const FOREFLIGHT_FLIGHT_HEADERS = [
  'Date',
  'AircraftID',
  'From',
  'To',
  'Route',
  'TotalTime',
  'PIC',
  'SIC',
  'Night',
  'Solo',
  'CrossCountry',
  'ActualInstrument',
  'SimulatedInstrument',
  'DualReceived',
  'DualGiven',
  'DayLandingsFullStop',
  'NightLandingsFullStop',
  'Holds',
  'PilotComments',
  'SimulatedFlight',
] as const

export const MYFLIGHTBOOK_HEADERS = [
  'Date',
  'Tail Number',
  'Model',
  'Total Flight Time',
  'Route',
  'PIC',
  'SIC',
  'Night',
  'X-Country',
  'Landings',
  'IMC',
  'Simulated Instrument',
  'Dual Received',
  'CFI',
  'Approaches',
  'Hold',
  'Comments',
] as const

export const LOGTEN_HEADERS = [
  'flight_flightDate',
  'aircraft_aircraftID',
  'aircraftType_make',
  'aircraftType_model',
  'aircraftType_selectedAircraftClass',
  'flight_flightNumber',
  'flight_from',
  'flight_to',
  'flight_route',
  'flight_totalTime',
  'flight_pic',
  'flight_sic',
  'flight_nightTime',
  'flight_crossCountry',
  'flight_dayLandings',
  'flight_nightLandings',
  'Remarks',
] as const

export const GENERIC_HEADERS = [
  'Date',
  'Registration',
  'Departure',
  'Destination',
  'Route',
  'Aircraft Make/Model',
  'Category/Class',
  'Total Time',
  'PIC',
  'SIC',
  'Night',
  'Cross Country',
  'Day Landings',
  'Night Landings',
  'Remarks',
] as const

export const LOGIFI_NATIVE_HEADERS = [
  'Date',
  'Role',
  'Aircraft Category/Class',
  'Aircraft Make/Model',
  'Registration',
  'Flight Number',
  'Departure',
  'Destination',
  'Route',
  'Training Elements',
  'Training Instructor',
  'Instructor Certificate',
  'Flight Conditions',
  'Remarks',
  'Tags',
  'Out',
  'Off',
  'On',
  'In',
  'Total Flight Time',
  'PIC',
  'SIC',
  'Dual Received',
  'Solo',
  'Night',
  'Actual Instrument',
  'Simulated Instrument',
  'Cross Country',
  'Ground Simulator',
  'Dual Given',
  'Day Landings',
  'Night Landings',
  'Instrument Approaches',
  'Approach Type',
  'Holding Procedures',
  'Is Imported',
  'Import Source',
  'Import Batch ID',
  'Original Entry Date',
  'Import Metadata',
  'Version',
  'Data Hash',
  'Created At',
  'Updated At',
] as const

function formatLogifiBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'Yes' : 'No'
}

function formatLogifiTimestamp(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toISOString()
  } catch {
    return value
  }
}

function formatLogifiJsonMetadata(value: Record<string, unknown> | null | undefined): string {
  if (!value) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function getInstrumentSplit(entry: LogEntry): [string, string] {
  const actualVal = entry.flightTime.actualInstrument
  const simulatedVal = entry.flightTime.simulatedInstrument
  return [
    actualVal ? formatDecimalHours(actualVal) : '',
    simulatedVal ? formatDecimalHours(simulatedVal) : '',
  ]
}

export function mapEntriesToForeFlightAircraftTable(entries: LogEntry[]): string[][] {
  const byTail = new Map<string, LogEntry>()

  for (const entry of entries) {
    const tail = formatRegistrationForExport(entry.registration)
    if (!tail) continue
    if (!byTail.has(tail)) byTail.set(tail, entry)
  }

  return [...byTail.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => {
      const tail = formatRegistrationForExport(entry.registration)
      const { make, model } = splitMakeModel(entry.aircraftMakeModel)
      return [
        tail,
        '', // EquipmentType
        '', // TypeCode
        '', // Year
        make,
        model,
        '', // GearType
        '', // EngineType
        entry.aircraftCategoryClass || '',
        '', // Complex
        '', // HighPerformance
        '', // Pressurized
        '', // TAA
      ]
    })
}

export function mapEntryToForeFlightFlightRow(entry: LogEntry): string[] {
  const tail = formatRegistrationForExport(entry.registration)
  const from = formatAirportCode(entry.departure)
  const to = formatAirportCode(entry.destination)
  const route = buildForeFlightRouteIntermediate(entry.departure, entry.route, entry.destination)
  const isSimulator = entry.logbookType === 'simulator'

  return [
    formatExportDate(entry.date, 'iso'),
    tail,
    from,
    to,
    route,
    formatDecimalHours(entry.flightTime.total),
    formatDecimalHours(entry.flightTime.pic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.sic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.night, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.solo, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.crossCountry, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.actualInstrument, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.simulatedInstrument, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.dual, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.dualGiven, { emptyWhenZero: true }),
    formatWholeNumber(entry.performance.dayLandings),
    formatWholeNumber(entry.performance.nightLandings),
    formatWholeNumber(entry.performance.holdingProcedures),
    entry.remarks || '',
    isSimulator ? formatDecimalHours(entry.flightTime.total) : '',
  ]
}

export function mapEntryToMyFlightbookRow(entry: LogEntry): string[] {
  const tail = formatRegistrationForExport(entry.registration)
  const route = buildFullRoute(entry.departure, entry.route, entry.destination)
  const landings =
    (entry.performance.dayLandings ?? 0) + (entry.performance.nightLandings ?? 0)
  const hold =
    (entry.performance.holdingProcedures ?? 0) > 0 ? 'Yes' : ''

  return [
    formatExportDate(entry.date, 'mdy'),
    tail,
    entry.aircraftMakeModel || '',
    formatDecimalHours(entry.flightTime.total),
    route,
    formatDecimalHours(entry.flightTime.pic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.sic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.night, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.crossCountry, { emptyWhenZero: true }),
    formatWholeNumber(landings),
    formatDecimalHours(entry.flightTime.actualInstrument, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.simulatedInstrument, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.dual, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.dualGiven, { emptyWhenZero: true }),
    formatWholeNumber(getTotalApproachCount(entry.performance)),
    hold,
    entry.remarks || '',
  ]
}

export function mapEntryToLogTenRow(entry: LogEntry): string[] {
  const tail = formatRegistrationForExport(entry.registration)
  const { make, model } = splitMakeModel(entry.aircraftMakeModel)
  const route = buildForeFlightRouteIntermediate(entry.departure, entry.route, entry.destination)

  return [
    formatExportDate(entry.date, 'logten'),
    tail,
    make,
    model,
    entry.aircraftCategoryClass || '',
    entry.flightNumber || '',
    formatAirportCode(entry.departure),
    formatAirportCode(entry.destination),
    route,
    formatDecimalHours(entry.flightTime.total),
    formatDecimalHours(entry.flightTime.pic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.sic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.night, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.crossCountry, { emptyWhenZero: true }),
    formatWholeNumber(entry.performance.dayLandings),
    formatWholeNumber(entry.performance.nightLandings),
    entry.remarks || '',
  ]
}

export function mapEntryToGenericRow(entry: LogEntry): string[] {
  const tail = formatRegistrationForExport(entry.registration)
  const route = buildFullRoute(entry.departure, entry.route, entry.destination)

  return [
    formatExportDate(entry.date, 'iso'),
    tail,
    formatAirportCode(entry.departure),
    formatAirportCode(entry.destination),
    route,
    entry.aircraftMakeModel || '',
    entry.aircraftCategoryClass || '',
    formatDecimalHours(entry.flightTime.total),
    formatDecimalHours(entry.flightTime.pic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.sic, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.night, { emptyWhenZero: true }),
    formatDecimalHours(entry.flightTime.crossCountry, { emptyWhenZero: true }),
    formatWholeNumber(entry.performance.dayLandings),
    formatWholeNumber(entry.performance.nightLandings),
    entry.remarks || '',
  ]
}

export function mapEntryToLogifiNativeRow(entry: LogEntry): string[] {
  return [
    formatLogifiNativeDate(entry.date),
    entry.role || '',
    entry.aircraftCategoryClass || '',
    entry.aircraftMakeModel || '',
    entry.registration || '',
    entry.flightNumber || '',
    entry.departure || '',
    entry.destination || '',
    entry.route || '',
    entry.trainingElements || '',
    entry.trainingInstructor || '',
    entry.instructorCertificate || '',
    (entry.flightConditions || []).join('; '),
    entry.remarks || '',
    (entry.tags || []).join(', '),
    entry.oooi?.out || '',
    entry.oooi?.off || '',
    entry.oooi?.on || '',
    entry.oooi?.in || '',
    formatDecimalHours(entry.flightTime.total),
    formatDecimalHours(entry.flightTime.pic),
    formatDecimalHours(entry.flightTime.sic),
    formatDecimalHours(entry.flightTime.dual),
    formatDecimalHours(entry.flightTime.solo),
    formatDecimalHours(entry.flightTime.night),
    ...getInstrumentSplit(entry),
    formatDecimalHours(entry.flightTime.crossCountry),
    '0.0',
    formatDecimalHours(entry.flightTime.dualGiven),
    formatWholeNumber(entry.performance.dayLandings),
    formatWholeNumber(entry.performance.nightLandings),
    String(getTotalApproachCount(entry.performance)),
    getApproachesFromPerformance(entry.performance)
      .map((a) => `${a.type} (${a.count})`)
      .join(', ') || '',
    formatWholeNumber(entry.performance.holdingProcedures),
    formatLogifiBoolean(entry.isImported),
    entry.importSource || '',
    entry.importBatchId || '',
    formatLogifiTimestamp(entry.originalEntryDate),
    formatLogifiJsonMetadata(entry.importMetadata),
    entry.version?.toString() || '',
    entry.dataHash || '',
    formatLogifiTimestamp(entry.createdAt),
    formatLogifiTimestamp(entry.updatedAt),
  ]
}
