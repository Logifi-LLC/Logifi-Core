/**
 * Solar Calculator - SunCalc Library Implementation
 * Calculates civil twilight times for a given date and location
 * 
 * Civil twilight is when the sun is 6 degrees below the horizon.
 * FAA defines "night" as the time between the end of evening civil twilight
 * and the beginning of morning civil twilight.
 * 
 * This implementation uses the SunCalc library for accurate astronomical calculations.
 */

// Import SunCalc - use default import for CommonJS compatibility
import SunCalc from 'suncalc'

// Add custom civil twilight times (sun 6° below horizon)
// SunCalc uses altitude angle: positive = above horizon, negative = below horizon
// This must be done once when the module loads
SunCalc.addTime(-6, 'civilDawn', 'civilDusk')

export interface CivilTwilightTimes {
  /** Evening civil twilight end (sun goes 6° below horizon) - UTC Date */
  eveningEnd: Date | null
  /** Morning civil twilight start (sun rises to 6° below horizon) - UTC Date */
  morningStart: Date | null
  /** Whether it's polar day (sun never sets below civil twilight) */
  isPolarDay: boolean
  /** Whether it's polar night (sun never rises above civil twilight) */
  isPolarNight: boolean
}

/**
 * Check if it's polar day or polar night by examining sun position
 * SunCalc returns null for times when the sun never reaches the specified angle
 */
function checkPolarCase(date: Date, latitude: number, longitude: number): { isPolarDay: boolean; isPolarNight: boolean } {
  // Check sun position at multiple times during the day
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  
  const testTimes = [
    new Date(year, month, day, 0, 0, 0),   // Midnight
    new Date(year, month, day, 6, 0, 0),   // 6 AM
    new Date(year, month, day, 12, 0, 0),  // Noon
    new Date(year, month, day, 18, 0, 0),  // 6 PM
  ]
  
  const civilTwilightAltitude = -6 // 6 degrees below horizon (in degrees)
  let allAbove = true
  let allBelow = true
  
  for (const testTime of testTimes) {
    const pos = SunCalc.getPosition(testTime, latitude, longitude)
    const altitudeDeg = pos.altitude * (180 / Math.PI)
    
    if (altitudeDeg > civilTwilightAltitude) {
      allBelow = false
    } else {
      allAbove = false
    }
  }
  
  if (allAbove) {
    return { isPolarDay: true, isPolarNight: false }
  } else if (allBelow) {
    return { isPolarDay: false, isPolarNight: true }
  }
  
  return { isPolarDay: false, isPolarNight: false }
}

/**
 * Calculate civil twilight times for a given date and location
 * @param date The date to calculate for (UTC)
 * @param latitude Latitude in degrees (positive = North)
 * @param longitude Longitude in degrees (positive = East)
 * @returns Civil twilight times in UTC
 */
export function getCivilTwilight(date: Date, latitude: number, longitude: number): CivilTwilightTimes {
  // Ensure latitude and longitude are numbers
  const lat = typeof latitude === 'number' ? latitude : parseFloat(String(latitude))
  const lon = typeof longitude === 'number' ? longitude : parseFloat(String(longitude))
  
  if (isNaN(lat) || isNaN(lon)) {
    console.error('[SolarCalc] Invalid coordinates:', { latitude, longitude, lat, lon })
    return {
      eveningEnd: null,
      morningStart: null,
      isPolarDay: false,
      isPolarNight: false
    }
  }
  
  // SunCalc uses the Date's local timezone to determine the day, but returns absolute times
  // Create a local date from the UTC date components for SunCalc
  // This ensures SunCalc calculates for the correct calendar day
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const localDate = new Date(year, month, day, 12, 0, 0) // Noon local time for the date
  
  console.log('[SolarCalc] Calculating twilight for:', {
    date: date.toISOString(),
    localDate: localDate.toISOString(),
    lat,
    lon
  })
  
  // Get all solar times including our custom civil twilight times
  const times = SunCalc.getTimes(localDate, lat, lon) as any
  
  console.log('[SolarCalc] SunCalc returned times:', {
    hasCivilDusk: !!times.civilDusk,
    hasCivilDawn: !!times.civilDawn,
    civilDusk: times.civilDusk?.toISOString(),
    civilDawn: times.civilDawn?.toISOString(),
    allKeys: Object.keys(times)
  })
  
  // Extract civil twilight times (these are the custom times we added via addTime)
  // TypeScript types don't include custom times, so we use type assertion
  const civilDusk = times.civilDusk as Date | undefined // Evening civil twilight end
  const civilDawn = times.civilDawn as Date | undefined // Morning civil twilight start
  
  // If times are null/undefined or invalid, check for polar cases
  if (!civilDusk || !civilDawn || isNaN(civilDusk.getTime()) || isNaN(civilDawn.getTime())) {
    console.warn('[SolarCalc] Civil twilight times are invalid, checking polar cases')
    const polarCase = checkPolarCase(localDate, lat, lon)
    console.log('[SolarCalc] Polar case result:', polarCase)
    
    return {
      eveningEnd: null,
      morningStart: null,
      isPolarDay: polarCase.isPolarDay,
      isPolarNight: polarCase.isPolarNight
    }
  }
  
  // SunCalc returns Date objects with absolute times (milliseconds since epoch)
  // These are correct regardless of timezone - we can use them directly
  // The Date objects represent the correct moment in time
  const result = {
    eveningEnd: new Date(civilDusk.getTime()),
    morningStart: new Date(civilDawn.getTime()),
    isPolarDay: false,
    isPolarNight: false
  }
  
  console.log('[SolarCalc] Returning twilight times:', {
    eveningEnd: result.eveningEnd.toISOString(),
    morningStart: result.morningStart.toISOString()
  })
  
  return result
}

/**
 * Check if a given time is during night (after evening civil twilight, before morning civil twilight)
 * @param time The time to check (UTC)
 * @param twilight The civil twilight times for the day
 * @returns true if the time is during night
 */
export function isNightTime(time: Date, twilight: CivilTwilightTimes): boolean {
  if (twilight.isPolarNight) return true
  if (twilight.isPolarDay) return false
  if (!twilight.eveningEnd || !twilight.morningStart) return false
  
  const timeMs = time.getTime()
  return timeMs >= twilight.eveningEnd.getTime() || timeMs < twilight.morningStart.getTime()
}
