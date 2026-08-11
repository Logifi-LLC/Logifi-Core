import type { LogEntry } from '../../app/utils/logbookTypes'
import type { BridgeSource } from '../logbookDataBridge/types'

/**
 * Provider keys exposed in the migration UI.
 * `custom_csv` maps to bridge source `generic`.
 */
export type ImportProviderKey = 'foreflight' | 'myflightbook' | 'logten' | 'custom_csv'

/**
 * Core fields every provider driver must populate.
 *
 * WHY: Product / handoff docs speak in this flat shape. Persistence still uses
 * nested `LogEntry` (`registration`, `flightTime.pic`, etc.). Drivers return
 * both so UI and tests can assert the contract without inventing a second DB.
 */
export interface LogifiCoreFlightRecord {
  date: string
  aircraftRegistration: string
  aircraftType: string
  departureAirport: string
  arrivalAirport: string
  totalDuration: number | null
  picTime: number | null
  dualReceived: number | null
  landingsDay: number | null
  landingsNight: number | null
  remarks: string
}

export interface ProviderParseResult {
  provider: ImportProviderKey
  bridgeSource: BridgeSource
  /** Flat core view for tests / handoff. */
  records: LogifiCoreFlightRecord[]
  /** Canonical Logifi entries for preview + persist. */
  entries: LogEntry[]
  warnings: string[]
  skipped: number
}

/**
 * Shared driver contract. All parsing is on-device / in-browser — no network.
 */
export interface ProviderImporter {
  readonly provider: ImportProviderKey
  readonly bridgeSource: BridgeSource
  parse(content: string, options?: { generateId?: () => string }): ProviderParseResult
}

export function toLogifiCoreFlightRecord(entry: LogEntry): LogifiCoreFlightRecord {
  return {
    date: entry.date,
    aircraftRegistration: entry.registration,
    aircraftType: entry.aircraftMakeModel,
    departureAirport: entry.departure,
    arrivalAirport: entry.destination,
    totalDuration: entry.flightTime.total,
    picTime: entry.flightTime.pic,
    dualReceived: entry.flightTime.dual,
    landingsDay: entry.performance.dayLandings,
    landingsNight: entry.performance.nightLandings,
    remarks: entry.remarks ?? '',
  }
}

/** Assert numeric fields are finite (or null) — never NaN after parse. */
export function assertFiniteCoreNumbers(record: LogifiCoreFlightRecord): boolean {
  const nums = [
    record.totalDuration,
    record.picTime,
    record.dualReceived,
    record.landingsDay,
    record.landingsNight,
  ]
  return nums.every((n) => n === null || (typeof n === 'number' && Number.isFinite(n)))
}

export function providerKeyToBridgeSource(provider: ImportProviderKey): BridgeSource {
  switch (provider) {
    case 'foreflight':
      return 'foreflight'
    case 'myflightbook':
      return 'myflightbook'
    case 'logten':
      return 'logten'
    case 'custom_csv':
      return 'generic'
  }
}
