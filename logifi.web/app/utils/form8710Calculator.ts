import type { LogEntry } from './logbookTypes'
import type {
  Form8710SectionII,
  Form8710SectionIII,
  CategoryFlightTimes,
  AircraftCategory8710,
  TimeTotals
} from './form8710Types'
import { mapCategoryTo8710 as mapCategory, isTrainingDevice as checkTrainingDevice } from './form8710Types'
import { DateTime } from 'luxon'

/**
 * Calculate Section III (Record of Pilot Time) totals from logbook entries
 */
export function calculateSectionIII(entries: LogEntry[]): Form8710SectionIII {
  const categoryMap = new Map<AircraftCategory8710, CategoryFlightTimes>()

  // Initialize all category structures
  const categoryKeys: AircraftCategory8710[] = [
    'airplane-sel', 'airplane-mel', 'airplane-ses', 'airplane-mes',
    'rotorcraft-heli', 'rotorcraft-gyro', 'glider',
    'lta-balloon', 'lta-airship', 'powered-lift',
    'ffs', 'ftd', 'atd'
  ]

  categoryKeys.forEach(category => {
    categoryMap.set(category, createEmptyCategoryFlightTimes(category))
  })

  // Process each entry
  entries.forEach(entry => {
    let category: AircraftCategory8710 | null = null

    // First check if it's a training device
    if (checkTrainingDevice(entry)) {
      // Try to determine which type of training device
      const makeModel = entry.aircraftMakeModel.toUpperCase()
      if (makeModel.includes('FFS') || makeModel.includes('FULL FLIGHT SIM')) {
        category = 'ffs'
      } else if (makeModel.includes('FTD') || makeModel.includes('FLIGHT TRAINING DEVICE')) {
        category = 'ftd'
      } else {
        category = 'atd'
      }
    } else {
      // Map from aircraft category/class
      category = mapCategory(entry.aircraftCategoryClass)
    }

    if (!category) {
      // Skip entries that don't map to a category
      return
    }

    const categoryData = categoryMap.get(category)!
    
    // Increment flight count
    categoryData.totalFlights++

    // Get flight time values (default to 0 if null)
    const total = entry.flightTime.total ?? 0
    const pic = entry.flightTime.pic ?? 0
    const sic = entry.flightTime.sic ?? 0
    const dual = entry.flightTime.dual ?? 0
    const solo = entry.flightTime.solo ?? 0
    const night = entry.flightTime.night ?? 0
    const actualInstrument = entry.flightTime.actualInstrument ?? 0
    const simulatedInstrument = entry.flightTime.simulatedInstrument ?? 0
    const crossCountry = entry.flightTime.crossCountry ?? 0

    const role = entry.role.toLowerCase()
    const hasNight = entry.flightConditions?.includes('nightVfr') || night > 0
    const hasCrossCountry = entry.flightConditions?.includes('crossCountry') || crossCountry > 0

    // Basic time accumulations
    categoryData.instructionReceived += dual
    categoryData.solo += solo
    categoryData.pic += pic
    categoryData.sic += sic

    // Instrument time (actual + simulated)
    categoryData.instrument += actualInstrument + simulatedInstrument

    // Cross country breakdowns
    if (hasCrossCountry) {
      if (role === 'dual received' || dual > 0) {
        categoryData.crossCountryInstructionReceived += crossCountry || total
      } else if (role === 'solo' || solo > 0) {
        categoryData.crossCountrySolo += crossCountry || total
      } else if (role === 'pic' || pic > 0) {
        categoryData.crossCountryPic += crossCountry || total
      } else if (role === 'sic' || sic > 0) {
        categoryData.crossCountrySic += crossCountry || total
      }
    }

    // Night time breakdowns
    if (hasNight) {
      if (role === 'dual received' || dual > 0) {
        categoryData.nightInstructionReceived += night || total
      }
      if (role === 'pic' || pic > 0) {
        categoryData.nightPic += night || total
      }
      if (role === 'sic' || sic > 0) {
        categoryData.nightSic += night || total
      }

      // Night takeoffs/landings from performance metrics
      const nightTakeoffs = entry.performance.nightTakeoffs ?? 0
      const nightLandings = entry.performance.nightLandings ?? 0
      const nightTOL = nightTakeoffs + nightLandings
      
      categoryData.nightTakeoffsLandings += nightTOL
      
      if (role === 'pic' || pic > 0) {
        categoryData.nightTakeoffsLandingsPic += nightTOL
      }
      if (role === 'sic' || sic > 0) {
        categoryData.nightTakeoffsLandingsSic += nightTOL
      }
    }

    // Glider specific (aero-tow, ground launch, powered launch)
    if (category === 'glider') {
      // Try to infer from remarks or training elements
      const remarks = (entry.remarks || '').toLowerCase()
      const training = (entry.trainingElements || '').toLowerCase()
      
      if (remarks.includes('aero-tow') || remarks.includes('aerotow') || training.includes('aero-tow')) {
        categoryData.aeroTowFlights = (categoryData.aeroTowFlights ?? 0) + 1
      } else if (remarks.includes('ground launch') || remarks.includes('winch') || training.includes('ground')) {
        categoryData.groundLaunchFlights = (categoryData.groundLaunchFlights ?? 0) + 1
      } else if (remarks.includes('powered') || remarks.includes('self-launch') || training.includes('powered')) {
        categoryData.poweredLaunchFlights = (categoryData.poweredLaunchFlights ?? 0) + 1
      }
    }
  })

  // Filter out categories with no flights
  const categories = Array.from(categoryMap.values()).filter(cat => cat.totalFlights > 0)

  return {
    categories
  }
}

/**
 * Calculate Section II (Recent Experience) totals
 */
export function calculateSectionII(entries: LogEntry[]): Form8710SectionII {
  const now = DateTime.now()
  const sixMonthsAgo = now.minus({ months: 6 })
  const twelveMonthsAgo = now.minus({ months: 12 })
  const twentyFourMonthsAgo = now.minus({ months: 24 })

  const last6Months = calculateTimeTotalsForPeriod(entries, sixMonthsAgo, now)
  const last12Months = calculateTimeTotalsForPeriod(entries, twelveMonthsAgo, now)
  const last24Months = calculateTimeTotalsForPeriod(entries, twentyFourMonthsAgo, now)
  const allTime = calculateTimeTotalsForPeriod(entries, DateTime.fromMillis(0), now)

  return {
    last6Months,
    last12Months,
    last24Months,
    allTime
  }
}

/**
 * Calculate time totals for a specific date range
 */
function calculateTimeTotalsForPeriod(
  entries: LogEntry[],
  startDate: DateTime,
  endDate: DateTime
): TimeTotals {
  const totals: TimeTotals = {
    totalTime: 0,
    picTime: 0,
    sicTime: 0,
    instructionReceived: 0,
    soloTime: 0,
    crossCountryTime: 0,
    instrumentTime: 0,
    nightTime: 0
  }

  entries.forEach(entry => {
    // Parse entry date
    const entryDate = DateTime.fromISO(entry.date)
    if (!entryDate.isValid || entryDate < startDate || entryDate > endDate) {
      return
    }

    totals.totalTime += entry.flightTime.total ?? 0
    totals.picTime += entry.flightTime.pic ?? 0
    totals.sicTime += entry.flightTime.sic ?? 0
    totals.instructionReceived += entry.flightTime.dual ?? 0
    totals.soloTime += entry.flightTime.solo ?? 0
    totals.crossCountryTime += entry.flightTime.crossCountry ?? 0
    totals.instrumentTime += (entry.flightTime.actualInstrument ?? 0) + (entry.flightTime.simulatedInstrument ?? 0)
    totals.nightTime += entry.flightTime.night ?? 0
  })

  return totals
}

/**
 * Create an empty CategoryFlightTimes object
 */
function createEmptyCategoryFlightTimes(category: AircraftCategory8710): CategoryFlightTimes {
  const base: CategoryFlightTimes = {
    category,
    totalFlights: 0,
    instructionReceived: 0,
    solo: 0,
    pic: 0,
    sic: 0,
    crossCountryInstructionReceived: 0,
    crossCountrySolo: 0,
    crossCountryPic: 0,
    crossCountrySic: 0,
    instrument: 0,
    nightInstructionReceived: 0,
    nightTakeoffsLandings: 0,
    nightPic: 0,
    nightSic: 0,
    nightTakeoffsLandingsPic: 0,
    nightTakeoffsLandingsSic: 0
  }

  // Add glider-specific fields if category is glider
  if (category === 'glider') {
    return {
      ...base,
      aeroTowFlights: 0,
      groundLaunchFlights: 0,
      poweredLaunchFlights: 0
    }
  }

  return base
}

