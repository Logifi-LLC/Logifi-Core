export const LOGBOOK_STORAGE_KEY = 'logifi://logbook/v1'

export type FlightTimeKey =
  | 'total'
  | 'pic'
  | 'sic'
  | 'dual'
  | 'solo'
  | 'night'
  | 'actualInstrument'
  | 'dualGiven'
  | 'crossCountry'
  | 'simulatedInstrument'
  | 'ffs'
  | 'ftd'
  | 'atd'

export interface FlightTimeBreakdown {
  total: number | null
  pic: number | null
  sic: number | null
  dual: number | null
  solo: number | null
  night: number | null
  actualInstrument: number | null
  dualGiven: number | null
  crossCountry: number | null
  simulatedInstrument: number | null
  /** Full Flight Simulator hours (8710) */
  ffs?: number | null
  /** Flight Training Device hours (8710) */
  ftd?: number | null
  /** Aviation Training Device hours (8710) */
  atd?: number | null
}

export type PerformanceKey =
  | 'dayTakeoffs'
  | 'nightTakeoffs'
  | 'dayLandings'
  | 'nightLandings'
  | 'approachCount'
  | 'approachType'
  | 'holdingProcedures'

/** Single approach record (type + count). Replaces single approachCount/approachType when present. */
export interface ApproachRecord {
  type: string
  count: number
}

export interface PerformanceMetrics {
  dayTakeoffs: number | null
  nightTakeoffs: number | null
  dayLandings: number | null
  nightLandings: number | null
  /** @deprecated Use approaches[].count sum instead. Kept for backward compatibility. */
  approachCount: number | null
  /** @deprecated Use approaches[].type instead. Kept for backward compatibility. */
  approachType: string | null
  /** List of approach types with counts. When present, this is the source of truth. */
  approaches?: ApproachRecord[]
  holdingProcedures: number | null
}

export interface OOOITimes {
  out: string | null
  off: string | null
  on: string | null
  in: string | null
  isZulu: boolean
}

export interface LogEntry {
  id: string
  date: string
  role: string
  aircraftCategoryClass: string
  categoryClassTime: number | null
  aircraftMakeModel: string
  registration: string
  flightNumber: string | null
  departure: string
  destination: string
  route: string
  trainingElements: string
  trainingInstructor: string
  instructorCertificate: string
  flightConditions: string[]
  remarks: string
  /** Optional tags (e.g. Checkride, Flight Review, IPC, Part 135) */
  tags?: string[]
  /** Which logbook this entry belongs to (filtered by switch). Default 'flight' for existing entries. */
  logbookType?: 'flight' | 'simulator'
  flightTime: FlightTimeBreakdown
  performance: PerformanceMetrics
  oooi?: OOOITimes
  flagged?: boolean
  version?: number // Entry version for data integrity tracking
  // Integrity fields
  dataHash?: string // SHA-256 hash of entry data for integrity verification
  createdAt?: string // ISO timestamp when entry was created
  updatedAt?: string // ISO timestamp when entry was last updated
  // Import tracking fields
  isImported?: boolean
  importSource?: string // 'csv', 'json', 'paper', etc.
  importBatchId?: string
  originalEntryDate?: string // Original creation date from source
  importMetadata?: Record<string, any> // Additional import info
}

export type EditableLogEntry = Omit<LogEntry, 'id'>

export type CatalogKey = 'aircraft' | 'airports' | 'pilots' | 'categoryClass'

export type LogbookColumnKey = 
  | 'date'
  | 'aircraft'
  | 'identification'
  | 'flightNumber'
  | 'fromTo'
  | 'conditions'
  | 'remarks'
  | 'pic'
  | 'sic'
  | 'dualR'
  | 'solo'
  | 'night'
  | 'actual'
  | 'hood'
  | 'dualG'
  | 'xc'
  | 'dayLandings'
  | 'nightLandings'
  | 'approach'
  | 'pilots'
  | 'total'

export interface LogbookColumnConfig {
  key: LogbookColumnKey
  label: string
  visible: boolean
  order: number
  required: boolean
  responsiveClass?: string // e.g., 'hidden xl:table-cell' for conditions
  width?: number // Column width in pixels
}

export const DEFAULT_COLUMN_CONFIG: LogbookColumnConfig[] = [
  { key: 'date', label: 'Date', visible: true, order: 0, required: true, width: 100 },
  { key: 'aircraft', label: 'Aircraft', visible: true, order: 1, required: false, width: 130 },
  { key: 'identification', label: 'Identification', visible: true, order: 2, required: false, width: 100 },
  { key: 'flightNumber', label: 'Flight Number', visible: false, order: 3, required: false, width: 100 },
  { key: 'fromTo', label: 'From → To', visible: true, order: 4, required: false, width: 150 },
  { key: 'conditions', label: 'Conditions', visible: true, order: 5, required: false, width: 120 },
  { key: 'remarks', label: 'Remarks', visible: true, order: 6, required: false, responsiveClass: 'hidden lg:table-cell', width: 200 },
  { key: 'pic', label: 'PIC', visible: false, order: 7, required: false, width: 70 },
  { key: 'sic', label: 'SIC', visible: false, order: 8, required: false, width: 70 },
  { key: 'dualR', label: 'Dual R', visible: false, order: 9, required: false, width: 80 },
  { key: 'solo', label: 'Solo', visible: false, order: 10, required: false, width: 70 },
  { key: 'night', label: 'Night', visible: false, order: 11, required: false, width: 70 },
  { key: 'actual', label: 'Actual', visible: false, order: 12, required: false, width: 80 },
  { key: 'hood', label: 'Hood', visible: false, order: 13, required: false, width: 70 },
  { key: 'dualG', label: 'Dual G', visible: false, order: 14, required: false, width: 80 },
  { key: 'xc', label: 'XC', visible: false, order: 15, required: false, width: 70 },
  { key: 'dayLandings', label: 'Day Landings', visible: false, order: 16, required: false, width: 100 },
  { key: 'nightLandings', label: 'Night Landings', visible: false, order: 17, required: false, width: 110 },
  { key: 'approach', label: 'Approach', visible: false, order: 18, required: false, width: 90 },
  { key: 'pilots', label: 'Pilots', visible: false, order: 19, required: false, width: 150 },
  { key: 'total', label: 'Total', visible: true, order: 20, required: true, width: 70 }
]

export const createEmptyFlightTime = (): FlightTimeBreakdown => ({
  total: null,
  pic: null,
  sic: null,
  dual: null,
  solo: null,
  night: null,
  actualInstrument: null,
  dualGiven: null,
  crossCountry: null,
  simulatedInstrument: null,
  ffs: null,
  ftd: null,
  atd: null
})

export const createEmptyPerformance = (): PerformanceMetrics => ({
  dayTakeoffs: null,
  nightTakeoffs: null,
  dayLandings: null,
  nightLandings: null,
  approachCount: null,
  approachType: null,
  approaches: [],
  holdingProcedures: null
})

/** Get approaches list; supports legacy approachCount/approachType when approaches is empty or missing. */
export function getApproachesFromPerformance(perf: PerformanceMetrics | null | undefined): ApproachRecord[] {
  if (!perf) return []
  if (perf.approaches && perf.approaches.length > 0) return perf.approaches
  const count = perf.approachCount ?? 0
  const type = (perf.approachType || '').trim() || 'Unknown'
  if (count <= 0 && !type) return []
  return [{ type, count: count || 1 }]
}

/** Total approach count from performance (for display/export). */
export function getTotalApproachCount(perf: PerformanceMetrics | null | undefined): number {
  return getApproachesFromPerformance(perf).reduce((sum, a) => sum + a.count, 0)
}

export const createEmptyOOOI = (): OOOITimes => ({
  out: null,
  off: null,
  on: null,
  in: null,
  isZulu: true
})

// Currency tracking types
export type CurrencyStatusType = 'current' | 'expired' | 'expiring_soon'

export interface CurrencyStatus {
  isCurrent: boolean
  daysRemaining?: number
  monthsRemaining?: number
  expirationDate: Date
  status: CurrencyStatusType
  qualifyingEntries: LogEntry[]
  // Type-specific counts
  takeoffs?: number
  landings?: number
  approaches?: number
  holdingProcedures?: number
}

export interface AnnualCurrencyStatus {
  isCurrent: boolean
  status: CurrencyStatusType
  requirements: string[]
  qualifyingEntries: LogEntry[]
}

