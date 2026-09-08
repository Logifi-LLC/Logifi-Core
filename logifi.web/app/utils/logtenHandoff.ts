import type { LogEntry } from '~/utils/logbookTypes'
import { formatExportDate, formatDecimalHours, formatAirportCode } from '../../shared/logbookDataBridge/formatters'
import { getApproachesFromPerformance } from '~/utils/logbookTypes'

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
    flight_flightDate: formatExportDate(entry.date, 'mdy'),
    flight_from: formatAirportCode(entry.departure),
    flight_to: formatAirportCode(entry.destination),
    flight_totalTime: formatDecimalHours(entry.flightTime.total),
  }

  // Aircraft information
  if (entry.registration) {
    entity.flight_selectedAircraftID = entry.registration.trim()
  }
  if (entry.aircraftMakeModel) {
    entity.flight_selectedAircraftType = entry.aircraftMakeModel.trim()
  }
  if (entry.aircraftCategoryClass) {
    entity.flight_selectedAircraftClass = entry.aircraftCategoryClass.trim()
  }

  // Flight number
  if (entry.flightNumber) {
    entity.flight_flightNumber = entry.flightNumber.trim()
  }

  // Route
  if (entry.route) {
    entity.flight_route = entry.route.trim()
  }

  // Remarks
  if (entry.remarks) {
    entity.flight_remarks = entry.remarks.trim()
  }

  // Flight times - PIC/SIC
  if (entry.flightTime.pic) {
    entity.flight_pic = formatDecimalHours(entry.flightTime.pic)
  }
  if (entry.flightTime.sic) {
    entity.flight_sic = formatDecimalHours(entry.flightTime.sic)
  }

  // Flight times - Night
  if (entry.flightTime.night) {
    entity.flight_night = formatDecimalHours(entry.flightTime.night)
  }

  // Flight times - Cross Country
  if (entry.flightTime.crossCountry) {
    entity.flight_crossCountry = formatDecimalHours(entry.flightTime.crossCountry)
  }

  // Flight times - Dual Received
  if (entry.flightTime.dual) {
    entity.flight_dualReceived = formatDecimalHours(entry.flightTime.dual)
  }

  // Flight times - Solo
  if (entry.flightTime.solo) {
    entity.flight_solo = formatDecimalHours(entry.flightTime.solo)
  }

  // Flight times - Actual Instrument
  if (entry.flightTime.actualInstrument) {
    entity.flight_actualInstrument = formatDecimalHours(entry.flightTime.actualInstrument)
  }

  // Flight times - Simulated Instrument (hood)
  if (entry.flightTime.simulatedInstrument) {
    entity.flight_simulatedInstrument = formatDecimalHours(entry.flightTime.simulatedInstrument)
  }

  // Flight times - Dual Given
  if (entry.flightTime.dualGiven) {
    entity.flight_dualGiven = formatDecimalHours(entry.flightTime.dualGiven)
  }

  // Flight times - Simulator (FFS, FTD, ATD combined as "ground")
  const simulatorTime = (entry.flightTime.ffs ?? 0) + (entry.flightTime.ftd ?? 0) + (entry.flightTime.atd ?? 0)
  if (simulatorTime > 0) {
    entity.flight_ground = formatDecimalHours(simulatorTime)
  }

  // Flight times - Night Vision Goggles
  if (entry.flightTime.nvg) {
    entity.flight_nightVisionGoggle = formatDecimalHours(entry.flightTime.nvg)
  }

  // Performance - Landings
  if (entry.performance.dayLandings) {
    entity.flight_dayLandings = entry.performance.dayLandings
  }
  if (entry.performance.nightLandings) {
    entity.flight_nightLandings = entry.performance.nightLandings
  }

  // Performance - Takeoffs
  if (entry.performance.dayTakeoffs) {
    entity.flight_dayTakeoffs = entry.performance.dayTakeoffs
  }
  if (entry.performance.nightTakeoffs) {
    entity.flight_nightTakeoffs = entry.performance.nightTakeoffs
  }

  // Performance - Holding Procedures
  if (entry.performance.holdingProcedures) {
    entity.flight_holds = entry.performance.holdingProcedures
  }

  // Performance - Approaches
  const approaches = getApproachesFromPerformance(entry.performance)
  if (approaches.length > 0) {
    // Map up to 10 approaches (LogTen supports flight_selectedApproach1 through flight_selectedApproach10)
    approaches.slice(0, 10).forEach((approach, index) => {
      const approachKey = `flight_selectedApproach${index + 1}`
      // Format as "TYPE (COUNT)" or just "TYPE" if count is 1
      const approachValue = approach.count > 1 
        ? `${approach.type} (${approach.count})`
        : approach.type
      entity[approachKey] = approachValue
    })
  }

  // Crew members
  if (entry.picName) {
    entity.flight_selectedCrewPIC = entry.picName.trim()
  }
  if (entry.sicName) {
    entity.flight_selectedCrewSIC = entry.sicName.trim()
  }
  if (entry.trainingElements && entry.trainingInstructor) {
    // Map based on role/job
    const job = entry.trainingInstructor.trim()
    const name = entry.trainingElements.trim()
    if (job === 'Instructor') {
      entity.flight_selectedCrewInstructor = name
    } else if (job === 'Student') {
      entity.flight_selectedCrewStudent = name
    }
  }

  // OOOI times
  if (entry.oooi?.out) {
    try {
      entity.flight_taxiOutTime = new Date(entry.oooi.out).toISOString()
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
      entity.flight_taxiInTime = new Date(entry.oooi.in).toISOString()
    } catch {}
  }

  // Flight conditions as boolean flags
  if (entry.flightConditions?.includes('IFR')) {
    entity.flight_ifrCapacity = true
  }

  // Logbook type - simulator flag
  if (entry.logbookType === 'simulator') {
    entity.flight_simulator = formatDecimalHours(entry.flightTime.total)
    entity.flight_type = 3 // Simulator type per LogTen API
  }

  return entity
}

export function buildLogTenPackage(entries: LogEntry[]): LogTenPackage {
  return {
    metadata: {
      application: 'Digifi/Logifi',
      version: '1.0',
      serviceID: 'com.logifi.digifi',
      dateFormat: 'MM/dd/yyyy',
      dateAndTimeFormat: 'MM/dd/yyyy HH:mm',
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

export interface LogTenHandoffResult {
  success: boolean
  url?: string
  tooLarge?: boolean
  error?: string
}

export function triggerLogTenHandoff(entries: LogEntry[]): LogTenHandoffResult {
  if (entries.length === 0) {
    return { success: false, error: 'No entries to send' }
  }

  try {
    const url = buildLogTenUrl(entries)
    
    if (url.length > 100000) {
      return {
        success: false,
        tooLarge: true,
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

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false
  }
  
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
