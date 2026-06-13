import type { LogEntry } from '../../app/utils/logbookTypes'

export type BridgeSource =
  | 'foreflight'
  | 'logten'
  | 'myflightbook'
  | 'logifi-native'
  | 'generic'

export type ExportDestination =
  | 'logifi-native'
  | 'foreflight'
  | 'myflightbook'
  | 'logten'
  | 'generic'

export interface ExportBuildOptions {
  filenameSegment?: string
  baseDate?: string
}

export interface ExportResult {
  filename: string
  mimeType: string
  content: string
  bom?: boolean
}

export interface BridgeImportOptions {
  source?: BridgeSource
  generateId?: () => string
}

export interface ParsedBridgeFile {
  source: BridgeSource
  delimiter: string
  headers: string[]
  rows: Record<string, string>[]
  aircraftHeaders?: string[]
  aircraftRows?: Record<string, string>[]
  skippedAircraftRows: number
}

export interface BridgeParseResult {
  source: BridgeSource
  entries: LogEntry[]
  skipped: number
  warnings: string[]
  aircraftRowCount: number
}

export const EXPORT_DESTINATION_LABELS: Record<
  'logifi-native' | 'generic' | 'foreflight' | 'myflightbook' | 'logten',
  string
> = {
  'logifi-native': 'Logifi (full)',
  generic: 'Generic CSV',
  foreflight: 'ForeFlight',
  myflightbook: 'MyFlightbook',
  logten: 'LogTen Pro',
}

export const EXPORT_DESTINATION_HINTS: Record<
  'logifi-native' | 'generic' | 'foreflight' | 'myflightbook' | 'logten',
  string
> = {
  'logifi-native':
    'Full Logifi export with metadata, integrity hashes, and compliance fields.',
  generic:
    'Clean universal CSV with standard column names. ISO dates and decimal hours.',
  foreflight:
    'ForeFlight template with Aircraft Table and Flights Table. Add matching aircraft to your ForeFlight hangar before import.',
  myflightbook:
    'UTF-8 CSV with exact MyFlightbook headers, including Role, Flight Number, Solo Time, and crew name columns. Ensure tail numbers exist in your MyFlightbook hangar.',
  logten:
    'Flat LogTen Pro column keys (flight_*, aircraft_*) for manual import mapping.',
}

export type ExportDateFormat = 'iso' | 'mdy' | 'logten'
