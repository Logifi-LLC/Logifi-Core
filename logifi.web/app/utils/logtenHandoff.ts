import type { LogEntry } from '~/utils/logbookTypes'
import { formatExportDate, formatDecimalHours, formatAirportCode } from '../../shared/logbookDataBridge/formatters'

export interface LogTenEntity {
  entity_name: string
  [key: string]: unknown
}

export interface LogTenPackage {
  metadata: {
    application: string
    version: string
    serviceID: string
    dateFormat: string
    dateAndTimeFormat: string
    timesAreZulu: boolean
  }
  entities: LogTenEntity[]
}

export function buildLogTenFlightEntity(entry: LogEntry): LogTenEntity {
  const entity: LogTenEntity = {
    entity_name: 'Flight',
    flight_key: entry.id,
    flight_flightDate: formatExportDate(entry.date, 'iso'),
    flight_from: formatAirportCode(entry.departure),
    flight_to: formatAirportCode(entry.destination),
    flight_totalTime: formatDecimalHours(entry.flightTime.total),
  }

  if (entry.flightTime.pic) {
    entity.flight_pic = formatDecimalHours(entry.flightTime.pic)
  }
  if (entry.flightTime.sic) {
    entity.flight_sic = formatDecimalHours(entry.flightTime.sic)
  }

  if (entry.registration) {
    entity.flight_selectedAircraftID = entry.registration.trim()
  }
  if (entry.aircraftMakeModel) {
    entity.flight_selectedAircraftType = entry.aircraftMakeModel.trim()
  }

  if (entry.oooi?.out) {
    try {
      entity.flight_takeoffTime = new Date(entry.oooi.out).toISOString()
    } catch {}
  }
  if (entry.oooi?.off) {
    try {
      entity.flight_takeoffTime_zulu = new Date(entry.oooi.off).toISOString()
    } catch {}
  }
  if (entry.oooi?.on) {
    try {
      entity.flight_landingTime_zulu = new Date(entry.oooi.on).toISOString()
    } catch {}
  }
  if (entry.oooi?.in) {
    try {
      entity.flight_landingTime = new Date(entry.oooi.in).toISOString()
    } catch {}
  }

  return entity
}

export function buildLogTenPackage(entries: LogEntry[]): LogTenPackage {
  return {
    metadata: {
      application: 'Digifi/Logifi',
      version: '1.0',
      serviceID: 'com.logifi.digifi',
      dateFormat: 'yyyy-MM-dd',
      dateAndTimeFormat: "yyyy-MM-dd'T'HH:mm:ss'Z'",
      timesAreZulu: true,
    },
    entities: entries.map(buildLogTenFlightEntity),
  }
}

export function buildLogTenUrl(entries: LogEntry[]): string {
  const pkg = buildLogTenPackage(entries)
  const jsonString = JSON.stringify(pkg)
  const encoded = encodeURIComponent(jsonString)
  return `logten://v2/addEntities?package=${encoded}`
}

export function triggerLogTenHandoff(entries: LogEntry[]): { success: boolean; url?: string; error?: string } {
  if (entries.length === 0) {
    return { success: false, error: 'No entries to send' }
  }

  try {
    const url = buildLogTenUrl(entries)
    
    if (url.length > 100000) {
      return {
        success: false,
        error: 'Payload too large. Try exporting fewer entries.',
        url,
      }
    }

    if (typeof window !== 'undefined') {
      window.location.href = url
    }

    return { success: true, url }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build LogTen URL',
    }
  }
}
