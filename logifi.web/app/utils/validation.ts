import type { LogEntry, FlightTimeBreakdown } from './logbookTypes'

export interface ValidationResult {
  type: 'error' | 'warning'
  field: string
  message: string
  suggestion?: string
  autoFix?: {
    field: string
    value: number | string | boolean
  }
}

export interface AirportCoordinates {
  latitude: number
  longitude: number
}

const FLOATING_POINT_TOLERANCE = 0.01

/**
 * Helper function to safely get a numeric value, treating null/undefined as 0 for calculations
 */
function getNumericValue(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) {
    return 0
  }
  return value
}

/**
 * Helper function to check if a value is provided (not null/undefined)
 */
function isProvided(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !isNaN(value)
}

/**
 * Check if two numbers are approximately equal within tolerance
 */
function approximatelyEqual(a: number, b: number, tolerance: number = FLOATING_POINT_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance
}

/**
 * Parse OOOI time string (HHMM format) to minutes since midnight for comparison
 */
function parseOOOITimeForValidation(time: string | null | undefined): number | null {
  if (!time || time.length === 0) return null
  // Parse 4-digit time string (HHMM) to minutes since midnight
  const digits = time.replace(/\D/g, '').padStart(4, '0')
  if (digits.length !== 4) return null
  const hours = parseInt(digits.slice(0, 2), 10)
  const minutes = parseInt(digits.slice(2, 4), 10)
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }
  return hours * 60 + minutes
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in nautical miles
 */
function calculateDistanceNM(coord1: AirportCoordinates, coord2: AirportCoordinates): number {
  const R = 3440.065 // Earth's radius in nautical miles
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

/**
 * Validate date for a log entry
 * @param entry - The log entry to validate
 * @param allEntries - Optional array of all entries for chronological order validation
 */
export function validateDate(entry: LogEntry, allEntries?: LogEntry[]): ValidationResult[] {
  const results: ValidationResult[] = []
  
  if (!entry.date) {
    return results
  }

  try {
    const entryDate = new Date(entry.date)
    const today = new Date()
    // Set time to midnight for accurate date comparison
    today.setHours(0, 0, 0, 0)
    entryDate.setHours(0, 0, 0, 0)

    // Check if date is in the future
    if (entryDate > today) {
      results.push({
        type: 'error',
        field: 'date',
        message: `Flight date (${entry.date}) cannot be in the future`,
        suggestion: 'Please enter a date that is today or in the past'
      })
    }

    // Reasonable date range checks
    const minDate = new Date('1900-01-01')
    minDate.setHours(0, 0, 0, 0)
    
    if (entryDate < minDate) {
      results.push({
        type: 'warning',
        field: 'date',
        message: `Flight date (${entry.date}) is before 1900, which seems unusually early`,
        suggestion: 'Please verify this date is correct. Historical logbook entries may be valid.'
      })
    }

    // Check if date is more than 100 years in the past
    const hundredYearsAgo = new Date()
    hundredYearsAgo.setFullYear(today.getFullYear() - 100)
    hundredYearsAgo.setHours(0, 0, 0, 0)
    
    if (entryDate < hundredYearsAgo) {
      results.push({
        type: 'warning',
        field: 'date',
        message: `Flight date (${entry.date}) is more than 100 years ago`,
        suggestion: 'Please verify this date is correct. Historical logbook entries may be valid.'
      })
    }

    // Chronological order checks (only if allEntries is provided)
    if (allEntries && allEntries.length > 0) {
      // Filter out the current entry being validated
      const otherEntries = allEntries.filter(e => e.id !== entry.id)
      
      if (otherEntries.length > 0) {
        // Sort entries by date and OOOI times (same logic as sortEntriesByDateAndOOOI)
        const sortedEntries = [...otherEntries].sort((a, b) => {
          // Primary sort: date (descending - most recent first)
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          const dateDiff = dateB - dateA
          
          if (dateDiff !== 0) {
            return dateDiff
          }
          
          // Secondary sort: OOOI "out" time (descending - latest first)
          const timeA = parseOOOITimeForValidation(a.oooi?.out ?? null)
          const timeB = parseOOOITimeForValidation(b.oooi?.out ?? null)
          
          if (timeA === null && timeB === null) return 0
          if (timeA === null) return 1 // a comes after b
          if (timeB === null) return -1 // a comes before b
          return timeB - timeA // descending order (latest first)
        })

        // Check if current entry date is before the most recent entry
        const mostRecentEntry = sortedEntries[0]
        if (mostRecentEntry && mostRecentEntry.date) {
          const mostRecentDate = new Date(mostRecentEntry.date)
          mostRecentDate.setHours(0, 0, 0, 0)
          
          if (entryDate < mostRecentDate) {
            results.push({
              type: 'warning',
              field: 'date',
              message: `Flight date (${entry.date}) is before your most recent entry (${mostRecentEntry.date})`,
              suggestion: 'Entries are typically added in chronological order. Verify this date is correct.'
            })
          }
        }
      }
    }
  } catch (err) {
    // Invalid date format
    results.push({
      type: 'error',
      field: 'date',
      message: 'Invalid date format',
      suggestion: 'Please enter a valid date'
    })
  }

  return results
}

/**
 * Validate flight time breakdown for a log entry
 */
export function validateFlightTime(entry: LogEntry): ValidationResult[] {
  const results: ValidationResult[] = []
  const flightTime = entry.flightTime

  if (!flightTime) {
    return results
  }

  const total = getNumericValue(flightTime.total)
  const pic = getNumericValue(flightTime.pic)
  const sic = getNumericValue(flightTime.sic)
  const dual = getNumericValue(flightTime.dual)
  const solo = getNumericValue(flightTime.solo)
  const night = getNumericValue(flightTime.night)
  const actualInstrument = getNumericValue(flightTime.actualInstrument)
  const simulatedInstrument = getNumericValue(flightTime.simulatedInstrument)
  const crossCountry = getNumericValue(flightTime.crossCountry)
  const dualGiven = getNumericValue(flightTime.dualGiven)

  const isTotalProvided = isProvided(flightTime.total)
  const isPicProvided = isProvided(flightTime.pic)
  const isSicProvided = isProvided(flightTime.sic)
  const isDualProvided = isProvided(flightTime.dual)

  // Check for negative values (errors)
  if (isProvided(flightTime.total) && total < 0) {
    results.push({
      type: 'error',
      field: 'total',
      message: 'Total time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.pic) && pic < 0) {
    results.push({
      type: 'error',
      field: 'pic',
      message: 'PIC time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.sic) && sic < 0) {
    results.push({
      type: 'error',
      field: 'sic',
      message: 'SIC time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.dual) && dual < 0) {
    results.push({
      type: 'error',
      field: 'dual',
      message: 'Dual received time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.solo) && solo < 0) {
    results.push({
      type: 'error',
      field: 'solo',
      message: 'Solo time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.night) && night < 0) {
    results.push({
      type: 'error',
      field: 'night',
      message: 'Night time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.actualInstrument) && actualInstrument < 0) {
    results.push({
      type: 'error',
      field: 'actualInstrument',
      message: 'Actual instrument time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.simulatedInstrument) && simulatedInstrument < 0) {
    results.push({
      type: 'error',
      field: 'simulatedInstrument',
      message: 'Simulated instrument time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.crossCountry) && crossCountry < 0) {
    results.push({
      type: 'error',
      field: 'crossCountry',
      message: 'Cross-country time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  if (isProvided(flightTime.dualGiven) && dualGiven < 0) {
    results.push({
      type: 'error',
      field: 'dualGiven',
      message: 'Dual given time cannot be negative',
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  // Continue validation even if there are errors - we want to show all issues

  // Check: PIC + SIC + Dual = Total (when all are provided)
  if (isPicProvided && isSicProvided && isDualProvided) {
    const breakdownSum = pic + sic + dual
    
    if (isTotalProvided) {
      if (!approximatelyEqual(breakdownSum, total)) {
        const difference = Math.abs(breakdownSum - total)
        results.push({
          type: 'warning',
          field: 'total',
          message: `Time breakdown doesn't match total (PIC + SIC + Dual = ${breakdownSum.toFixed(2)}, but Total = ${total.toFixed(2)})`,
          suggestion: `Consider setting Total to ${breakdownSum.toFixed(2)} hours, or adjust the breakdown to match the total`
        })
      }
    } else {
      // Breakdown provided but no total - suggest calculating total
      results.push({
        type: 'warning',
        field: 'total',
        message: 'Time breakdown provided but total time is missing',
        suggestion: `Consider setting Total to ${breakdownSum.toFixed(2)} hours (PIC + SIC + Dual)`
      })
    }
  } else if (isTotalProvided && (isPicProvided || isSicProvided || isDualProvided)) {
    // Total provided but incomplete breakdown - this is okay, just a note
    // Don't add a warning for this as partial breakdowns are valid
  }

  // Check: Individual time fields must be <= total (when total is provided)
  if (isTotalProvided && total > 0) {
    if (isProvided(flightTime.night) && night > total) {
      results.push({
        type: 'warning',
        field: 'night',
        message: `Night time (${night.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Night time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.actualInstrument) && actualInstrument > total) {
      results.push({
        type: 'warning',
        field: 'actualInstrument',
        message: `Actual instrument time (${actualInstrument.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Actual instrument time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.simulatedInstrument) && simulatedInstrument > total) {
      results.push({
        type: 'warning',
        field: 'simulatedInstrument',
        message: `Simulated instrument time (${simulatedInstrument.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Simulated instrument time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.crossCountry) && crossCountry > total) {
      results.push({
        type: 'warning',
        field: 'crossCountry',
        message: `Cross-country time (${crossCountry.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Cross-country time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.solo) && solo > total) {
      results.push({
        type: 'warning',
        field: 'solo',
        message: `Solo time (${solo.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Solo time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.dualGiven) && dualGiven > total) {
      results.push({
        type: 'warning',
        field: 'dualGiven',
        message: `Dual given time (${dualGiven.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Dual given time should not exceed total flight time'
      })
    }

    // Check PIC, SIC, Dual individually against total
    if (isProvided(flightTime.pic) && pic > total) {
      results.push({
        type: 'warning',
        field: 'pic',
        message: `PIC time (${pic.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'PIC time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.sic) && sic > total) {
      results.push({
        type: 'warning',
        field: 'sic',
        message: `SIC time (${sic.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'SIC time should not exceed total flight time'
      })
    }

    if (isProvided(flightTime.dual) && dual > total) {
      results.push({
        type: 'warning',
        field: 'dual',
        message: `Dual received time (${dual.toFixed(2)}) exceeds total time (${total.toFixed(2)})`,
        suggestion: 'Dual received time should not exceed total flight time'
      })
    }
  }

  // Check: If other times are provided but total is missing, suggest calculating
  const hasAnyTimeField = isPicProvided || isSicProvided || isDualProvided || 
                          isProvided(flightTime.solo) || isProvided(flightTime.night) ||
                          isProvided(flightTime.actualInstrument) || isProvided(flightTime.simulatedInstrument) ||
                          isProvided(flightTime.crossCountry) || isProvided(flightTime.dualGiven)

  if (hasAnyTimeField && !isTotalProvided) {
    // Only suggest if we have enough data to calculate a meaningful total
    if (isPicProvided || isSicProvided || isDualProvided) {
      const calculatedTotal = pic + sic + dual
      if (calculatedTotal > 0) {
        results.push({
          type: 'warning',
          field: 'total',
          message: 'Time fields provided but total time is missing',
          suggestion: `Consider setting Total to ${calculatedTotal.toFixed(2)} hours based on your breakdown`
        })
      }
    }
  }

  return results
}

/**
 * Validate cross-country flight requirements
 * Cross-country flights must have different departure and destination airports
 * Both airports should be valid (not UNKNOWN or empty)
 * For Part 61 purposes, cross-country typically requires at least 50nm distance
 * 
 * @param entry - The log entry to validate
 * @param airportCoords - Optional object with departure and destination airport coordinates
 *                        If provided, will calculate distance and validate 50nm minimum
 */
export function validateCrossCountry(
  entry: LogEntry, 
  airportCoords?: { departure?: AirportCoordinates; destination?: AirportCoordinates }
): ValidationResult[] {
  const results: ValidationResult[] = []
  const flightTime = entry.flightTime
  const hasCrossCountryTime = isProvided(flightTime?.crossCountry) && getNumericValue(flightTime.crossCountry) > 0

  const departure = (entry.departure || '').trim().toUpperCase()
  const destination = (entry.destination || '').trim().toUpperCase()

  // Check if departure and destination are the same
  if (departure && destination && departure === destination && departure !== 'UNKNOWN') {
    if (hasCrossCountryTime) {
      results.push({
        type: 'warning',
        field: 'crossCountry',
        message: `Cross-country time logged but departure and destination are the same (${entry.departure})`,
        suggestion: 'Cross-country flights typically require different departure and destination airports. Verify this entry is correct.'
      })
    }
    return results // Early return - can't validate distance if same airport
  }

  // Check if either airport is UNKNOWN or empty
  if (departure === 'UNKNOWN' || departure === '' || destination === 'UNKNOWN' || destination === '') {
    if (hasCrossCountryTime) {
      results.push({
        type: 'warning',
        field: 'crossCountry',
        message: 'Cross-country time logged but departure or destination airport is missing or unknown',
        suggestion: 'Cross-country flights should have valid departure and destination airports. Please verify this entry.'
      })
    }
    return results // Early return - can't validate distance without valid airports
  }

  // If we have coordinates, calculate distance and validate 50nm minimum
  if (airportCoords?.departure && airportCoords?.destination) {
    const distance = calculateDistanceNM(airportCoords.departure, airportCoords.destination)
    const MIN_CROSS_COUNTRY_DISTANCE_NM = 50

    if (hasCrossCountryTime && distance < MIN_CROSS_COUNTRY_DISTANCE_NM) {
      results.push({
        type: 'warning',
        field: 'crossCountry',
        message: `Cross-country time logged but distance is only ${distance.toFixed(1)}nm (minimum is typically 50nm for Part 61)`,
        suggestion: `The flight from ${entry.departure} to ${entry.destination} is ${distance.toFixed(1)}nm. Cross-country flights typically require at least 50nm distance. Verify this entry is correct.`
      })
    } else if (!hasCrossCountryTime && distance >= MIN_CROSS_COUNTRY_DISTANCE_NM) {
      // Suggest adding cross-country time if distance meets requirement
      // Auto-fix: Set cross-country time to total time if available
      const totalTime = getNumericValue(flightTime?.total)
      const autoFixValue = totalTime > 0 ? totalTime : null
      
      results.push({
        type: 'warning',
        field: 'crossCountry',
        message: `Flight distance is ${distance.toFixed(1)}nm (meets 50nm cross-country requirement) but no cross-country time is logged`,
        suggestion: `Consider logging cross-country time for this flight. The distance from ${entry.departure} to ${entry.destination} is ${distance.toFixed(1)}nm.`,
        autoFix: autoFixValue !== null ? {
          field: 'crossCountry',
          value: autoFixValue
        } : undefined
      })
    }
  }

  return results
}

/**
 * Validate Part 61.51(b) required fields for a log entry
 * Per 14 CFR Part 61.51(b), each logbook entry must include:
 * - Date
 * - Total flight time or lesson time
 * - Location (departure and destination)
 * - Type and identification of aircraft
 * - PIC time or Solo time (when applicable)
 * - Type of pilot experience or training
 * - Conditions of flight
 */
export function validatePart61RequiredFields(entry: LogEntry): ValidationResult[] {
  const results: ValidationResult[] = []
  const flightTime = entry.flightTime || { total: null, pic: null, sic: null, dual: null, solo: null, night: null, actualInstrument: null, simulatedInstrument: null, crossCountry: null, dualGiven: null }

  // 1. Date (required per Part 61.51(b))
  if (!entry.date || entry.date.trim() === '') {
    results.push({
      type: 'error',
      field: 'date',
      message: 'Date is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter the date of the flight'
    })
  }

  // 2. Total flight time OR lesson time (at least one must be > 0)
  const totalTime = getNumericValue(flightTime.total)
  const dualTime = getNumericValue(flightTime.dual) // Lesson time
  const hasTotalTime = isProvided(flightTime.total) && totalTime > 0
  const hasLessonTime = isProvided(flightTime.dual) && dualTime > 0

  if (!hasTotalTime && !hasLessonTime) {
    results.push({
      type: 'error',
      field: 'total',
      message: 'Total flight time or lesson time is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter either total flight time or dual received (lesson) time'
    })
  }

  // 3. Location: departure AND destination airports (both required)
  const departure = (entry.departure || '').trim()
  const destination = (entry.destination || '').trim()

  if (!departure || departure === '') {
    results.push({
      type: 'error',
      field: 'departure',
      message: 'Departure airport is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter the departure airport code or location'
    })
  }

  if (!destination || destination === '') {
    results.push({
      type: 'error',
      field: 'destination',
      message: 'Destination airport is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter the destination airport code or location'
    })
  }

  // 4. Aircraft type and identification
  const categoryClass = (entry.aircraftCategoryClass || '').trim()
  const makeModel = (entry.aircraftMakeModel || '').trim()
  const registration = (entry.registration || '').trim()

  if (!categoryClass || categoryClass === '') {
    results.push({
      type: 'error',
      field: 'aircraftCategoryClass',
      message: 'Aircraft category and class is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter the aircraft category and class (e.g., "ASEL", "AMEL")'
    })
  }

  if (!makeModel || makeModel === '') {
    results.push({
      type: 'error',
      field: 'aircraftMakeModel',
      message: 'Aircraft make and model is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter the aircraft make and model'
    })
  }

  if (!registration || registration === '') {
    results.push({
      type: 'error',
      field: 'registration',
      message: 'Aircraft identification (registration) is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please enter the aircraft registration number (N-number)'
    })
  }

  // 5. PIC, Solo, SIC, or Dual Received time (at least one must be logged when applicable)
  // This is required when logging flight time, but not necessarily for all entries
  // If total time is logged, we should have at least one of: PIC, Solo, SIC, or Dual Received
  // Note: dualTime is already declared above (line 559) for lesson time check
  if (hasTotalTime) {
    // Check if we have at least one of the required time types
    const picTime = getNumericValue(flightTime.pic)
    const soloTime = getNumericValue(flightTime.solo)
    const sicTime = getNumericValue(flightTime.sic)
    // Use dualTime that was already calculated above (line 559)
    
    const hasPicTime = picTime > 0
    const hasSoloTime = soloTime > 0
    const hasSicTime = sicTime > 0
    const hasDualTime = dualTime > 0
    
    // If we don't have any of these time types, show error
    if (!hasPicTime && !hasSoloTime && !hasSicTime && !hasDualTime) {
      results.push({
        type: 'error',
        field: 'pic',
        message: 'PIC, Solo, SIC, or Dual Received time is required per 14 CFR Part 61.51(b) when logging flight time',
        suggestion: 'Please enter at least one of: PIC time, Solo time, SIC time, or Dual Received time for this flight'
      })
    }
  }

  // 6. Type of pilot experience (role field must be valid)
  const validRoles = ['PIC', 'SIC', 'Student', 'Instructor', 'CFI', 'CFII', 'MEI', 'ATP', 'Commercial', 'Private']
  const role = (entry.role || '').trim()
  
  if (!role || role === '') {
    results.push({
      type: 'error',
      field: 'role',
      message: 'Type of pilot experience or training is required per 14 CFR Part 61.51(b)',
      suggestion: 'Please select your role for this flight (PIC, SIC, Student, Instructor, etc.)'
    })
  } else if (!validRoles.some(r => role.toUpperCase().includes(r.toUpperCase()))) {
    // Warn if role doesn't match common values, but don't block
    results.push({
      type: 'warning',
      field: 'role',
      message: `Role "${role}" may not be a standard pilot experience type`,
      suggestion: 'Common roles include: PIC, SIC, Student, Instructor, CFI, CFII, MEI, ATP, Commercial, Private'
    })
  }

  // 7. Conditions of flight (day/night indicator - must be present if night time logged)
  const nightTime = getNumericValue(flightTime.night)
  const hasNightTime = isProvided(flightTime.night) && nightTime > 0
  const flightConditions = entry.flightConditions || []
  const hasDayCondition = flightConditions.some(c => c.toLowerCase().includes('day'))
  const hasNightCondition = flightConditions.some(c => c.toLowerCase().includes('night'))

  if (hasNightTime && !hasNightCondition) {
    results.push({
      type: 'warning',
      field: 'flightConditions',
      message: 'Night time is logged but flight conditions do not indicate night flight',
      suggestion: 'Please add "Night" to flight conditions if this flight included night time'
    })
  }

  // Also check if day/night conditions are present when they should be
  if (hasTotalTime && !hasDayCondition && !hasNightCondition && flightConditions.length === 0) {
    results.push({
      type: 'warning',
      field: 'flightConditions',
      message: 'Flight conditions (day/night) should be recorded per 14 CFR Part 61.51(b)',
      suggestion: 'Please indicate whether this flight was conducted during day or night conditions'
    })
  }

  return results
}

/**
 * Validate date format
 * Accepts any valid date format (MM/DD/YYYY, YYYY-MM-DD, etc.) and validates that it can be parsed
 */
export function validateDateFormat(date: string | null | undefined): ValidationResult[] {
  const results: ValidationResult[] = []

  if (!date || date.trim() === '') {
    return results // Empty dates are handled by required field validation
  }

  const trimmedDate = date.trim()

  // Try to parse the date - JavaScript Date constructor is flexible with formats
  // It handles: YYYY-MM-DD, MM/DD/YYYY, and other common formats
  const parsedDate = new Date(trimmedDate)
  
  // Check if the date is invalid
  if (isNaN(parsedDate.getTime())) {
    results.push({
      type: 'error',
      field: 'date',
      message: `Date "${trimmedDate}" is not a valid date`,
      suggestion: 'Please enter a valid date in any recognized format (e.g., MM/DD/YYYY, YYYY-MM-DD)'
    })
    return results
  }

  // Additional check: ensure the date is reasonable (not too far in the past or future)
  // This is a warning/error check, not a format check
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date('1900-01-01')
  minDate.setHours(0, 0, 0, 0)
  
  parsedDate.setHours(0, 0, 0, 0)
  
  if (parsedDate < minDate) {
    results.push({
      type: 'warning',
      field: 'date',
      message: `Date "${trimmedDate}" is before 1900, which seems unusually early`,
      suggestion: 'Please verify this date is correct. Historical logbook entries may be valid.'
    })
  }
  
  if (parsedDate > today) {
    results.push({
      type: 'error',
      field: 'date',
      message: `Date "${trimmedDate}" is in the future`,
      suggestion: 'Please enter a date that is today or in the past'
    })
  }

  return results
}

/**
 * Validate airport code format
 * Accepts ICAO (4 letters) or IATA (3 letters) format
 * Allows "UNKNOWN" with a warning
 */
export function validateAirportCode(
  code: string | null | undefined, 
  field: 'departure' | 'destination'
): ValidationResult[] {
  const results: ValidationResult[] = []

  if (!code || code.trim() === '') {
    return results // Empty codes are handled by required field validation
  }

  const trimmedCode = code.trim().toUpperCase()
  const fieldName = field === 'departure' ? 'Departure' : 'Destination'

  // Allow UNKNOWN with warning
  if (trimmedCode === 'UNKNOWN') {
    results.push({
      type: 'warning',
      field: field,
      message: `${fieldName} airport is marked as UNKNOWN`,
      suggestion: 'Consider updating with the actual airport code if known'
    })
    return results
  }

  // ICAO format: exactly 4 uppercase letters
  const icaoPattern = /^[A-Z]{4}$/
  // IATA format: exactly 3 uppercase letters
  const iataPattern = /^[A-Z]{3}$/

  if (icaoPattern.test(trimmedCode)) {
    // Valid ICAO code
    return results
  } else if (iataPattern.test(trimmedCode)) {
    // Valid IATA code
    return results
  } else {
    // Invalid format
    results.push({
      type: 'error',
      field: field,
      message: `${fieldName} airport code "${code}" is not in a valid format`,
      suggestion: 'Airport codes should be 3 letters (IATA, e.g., ORD) or 4 letters (ICAO, e.g., KORD)'
    })
  }

  return results
}

/**
 * Validate aircraft registration format
 * US N-number format: N followed by 1-5 digits, optionally followed by 1-2 letters
 * Pattern: /^N\d{1,5}[A-Z]{0,2}$/i
 */
export function validateAircraftRegistration(registration: string | null | undefined): ValidationResult[] {
  const results: ValidationResult[] = []

  if (!registration || registration.trim() === '') {
    return results // Empty registration is handled by required field validation
  }

  const trimmedReg = registration.trim().toUpperCase()

  // US N-number pattern: N followed by 1-5 digits, optionally followed by 0-2 letters
  const nNumberPattern = /^N\d{1,5}[A-Z]{0,2}$/

  if (nNumberPattern.test(trimmedReg)) {
    // Valid N-number format
    return results
  } else {
    // Check if it starts with N (might be close)
    if (trimmedReg.startsWith('N')) {
      results.push({
        type: 'warning',
        field: 'registration',
        message: `Aircraft registration "${registration}" does not match standard N-number format`,
        suggestion: 'US N-numbers should be in format: N followed by 1-5 digits and optionally 1-2 letters (e.g., N123AB, N12345, N1A)'
      })
    } else {
      // Doesn't start with N - might be foreign registration
      results.push({
        type: 'warning',
        field: 'registration',
        message: `Aircraft registration "${registration}" does not appear to be a US N-number`,
        suggestion: 'If this is a US-registered aircraft, N-numbers should start with "N" followed by digits and optional letters'
      })
    }
  }

  return results
}

/**
 * Validate numeric precision for flight times
 * Flight times should be to 0.1 hour precision (warn if more decimal places)
 */
export function validateNumericPrecision(
  value: number | null | undefined, 
  field: string
): ValidationResult[] {
  const results: ValidationResult[] = []

  if (value === null || value === undefined || isNaN(value)) {
    return results // Empty values are handled elsewhere
  }

  // Check decimal places
  const decimalPlaces = (value.toString().split('.')[1] || '').length

  if (decimalPlaces > 1) {
    results.push({
      type: 'warning',
      field: field,
      message: `${field} has ${decimalPlaces} decimal places. Flight times are typically recorded to 0.1 hour precision`,
      suggestion: `Consider rounding to 0.1 hour precision (e.g., ${value.toFixed(1)})`
    })
  }

  // Negative values are already checked in validateFlightTime, but double-check here
  if (value < 0) {
    results.push({
      type: 'error',
      field: field,
      message: `${field} cannot be negative`,
      suggestion: 'Please enter a positive value or leave blank'
    })
  }

  return results
}

