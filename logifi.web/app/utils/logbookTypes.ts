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
  | 'simulator'

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
  simulator: number | null
}

export type PerformanceKey =
  | 'dayTakeoffs'
  | 'nightTakeoffs'
  | 'dayLandings'
  | 'nightLandings'
  | 'approachCount'
  | 'approachType'
  | 'holdingProcedures'

export interface PerformanceMetrics {
  dayTakeoffs: number | null
  nightTakeoffs: number | null
  dayLandings: number | null
  nightLandings: number | null
  approachCount: number | null
  approachType: string | null
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
  flightTime: FlightTimeBreakdown
  performance: PerformanceMetrics
  oooi?: OOOITimes
}

export type EditableLogEntry = Omit<LogEntry, 'id'>

export type CatalogKey = 'aircraft' | 'airports' | 'pilots' | 'categoryClass'

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
  simulator: null
})

export const createEmptyPerformance = (): PerformanceMetrics => ({
  dayTakeoffs: null,
  nightTakeoffs: null,
  dayLandings: null,
  nightLandings: null,
  approachCount: null,
  approachType: null,
  holdingProcedures: null
})

export const createEmptyOOOI = (): OOOITimes => ({
  out: null,
  off: null,
  on: null,
  in: null,
  isZulu: true
})

