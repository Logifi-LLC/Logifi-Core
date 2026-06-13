import {
  buildCsvContent,
  escapeCsvValue,
} from './formatters'
import {
  FOREFLIGHT_AIRCRAFT_HEADERS,
  FOREFLIGHT_FLIGHT_HEADERS,
  GENERIC_HEADERS,
  LOGIFI_NATIVE_HEADERS,
  LOGTEN_HEADERS,
  MYFLIGHTBOOK_HEADERS,
  mapEntriesToForeFlightAircraftTable,
  mapEntryToForeFlightFlightRow,
  mapEntryToGenericRow,
  mapEntryToLogTenRow,
  mapEntryToLogifiNativeRow,
  mapEntryToMyFlightbookRow,
} from './exportMappers'
import type { ExportBuildOptions, ExportResult } from './types'
import type { LogEntry } from '../../app/utils/logbookTypes'

type ExportDestination =
  | 'logifi-native'
  | 'foreflight'
  | 'myflightbook'
  | 'logten'
  | 'generic'

function resolveBaseDate(options?: ExportBuildOptions): string {
  return options?.baseDate ?? new Date().toISOString().split('T')[0] ?? ''
}

export function buildExportFilename(
  destination: ExportDestination,
  options?: ExportBuildOptions
): string {
  const baseDate = resolveBaseDate(options)
  const segment = options?.filenameSegment ?? ''
  const prefixByDestination: Record<ExportDestination, string> = {
    'logifi-native': 'logifi-logbook',
    generic: 'logifi-export-generic',
    foreflight: 'logifi-export-foreflight',
    myflightbook: 'logifi-export-myflightbook',
    logten: 'logifi-export-logten',
  }
  return `${prefixByDestination[destination]}-${baseDate}${segment}.csv`
}

function buildTableCsv(headers: readonly string[], rows: string[][]): string {
  return buildCsvContent([...headers], rows)
}

export function exportToForeFlight(
  rows: LogEntry[],
  options?: ExportBuildOptions
): ExportResult {
  const aircraftRows = mapEntriesToForeFlightAircraftTable(rows)
  const flightRows = rows.map(mapEntryToForeFlightFlightRow)

  const sections = [
    buildTableCsv(FOREFLIGHT_AIRCRAFT_HEADERS, aircraftRows),
    '',
    buildTableCsv(FOREFLIGHT_FLIGHT_HEADERS, flightRows),
  ]

  return {
    filename: buildExportFilename('foreflight', options),
    mimeType: 'text/csv;charset=utf-8;',
    content: sections.join('\n'),
  }
}

export function exportToMyFlightbook(
  rows: LogEntry[],
  options?: ExportBuildOptions
): ExportResult {
  const csvRows = rows.map(mapEntryToMyFlightbookRow)
  return {
    filename: buildExportFilename('myflightbook', options),
    mimeType: 'text/csv;charset=utf-8;',
    content: buildCsvContent([...MYFLIGHTBOOK_HEADERS], csvRows, { bom: true }),
    bom: true,
  }
}

export function exportToLogTenPro(
  rows: LogEntry[],
  options?: ExportBuildOptions
): ExportResult {
  const csvRows = rows.map(mapEntryToLogTenRow)
  return {
    filename: buildExportFilename('logten', options),
    mimeType: 'text/csv;charset=utf-8;',
    content: buildCsvContent([...LOGTEN_HEADERS], csvRows),
  }
}

export function exportToGenericCSV(
  rows: LogEntry[],
  options?: ExportBuildOptions
): ExportResult {
  const csvRows = rows.map(mapEntryToGenericRow)
  return {
    filename: buildExportFilename('generic', options),
    mimeType: 'text/csv;charset=utf-8;',
    content: buildCsvContent([...GENERIC_HEADERS], csvRows),
  }
}

export function exportToLogifiNative(
  rows: LogEntry[],
  options?: ExportBuildOptions
): ExportResult {
  const csvRows = rows.map(mapEntryToLogifiNativeRow)
  return {
    filename: buildExportFilename('logifi-native', options),
    mimeType: 'text/csv;charset=utf-8;',
    content: buildCsvContent([...LOGIFI_NATIVE_HEADERS], csvRows),
  }
}

/** Build a single-row object keyed by header for import round-trip tests. */
export function buildHeaderRowObject(
  headers: readonly string[],
  row: string[]
): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((header, index) => {
    out[header] = row[index] ?? ''
  })
  return out
}

export { escapeCsvValue }
