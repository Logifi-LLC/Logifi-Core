import type { LogEntry, FlightTimeBreakdown } from './logbookTypes'

export interface ValidationResult {
  type: 'error' | 'warning'
  field: string
  message: string
  suggestion?: string
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
 * Validate date for a log entry
 */
export function validateDate(entry: LogEntry): ValidationResult[] {
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

