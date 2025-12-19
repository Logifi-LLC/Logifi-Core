/**
 * Night Time Calculator
 * Calculates the amount of flight time that occurs during "night" per FAA definition
 * (between end of evening civil twilight and beginning of morning civil twilight)
 */

import { getCivilTwilight, type CivilTwilightTimes } from './solarCalculator'

export interface NightTimeParams {
  /** Flight date (YYYY-MM-DD format) */
  date: string
  /** Departure airport latitude */
  depLatitude: number
  /** Departure airport longitude */
  depLongitude: number
  /** Destination airport latitude (optional - uses departure if not provided) */
  destLatitude?: number
  /** Destination airport longitude (optional - uses departure if not provided) */
  destLongitude?: number
  /** OOOI Out time (HH:MM format, assumed UTC if isZulu is true) */
  outTime: string
  /** OOOI In time (HH:MM format, assumed UTC if isZulu is true) */
  inTime: string
  /** Whether times are in Zulu/UTC (default: true) */
  isZulu?: boolean
}

export interface NightTimeResult {
  /** Night time in decimal hours */
  nightHours: number
  /** Total flight time in decimal hours */
  totalHours: number
  /** Evening civil twilight end time (UTC) */
  eveningTwilight: Date | null
  /** Morning civil twilight start time (UTC) */
  morningTwilight: Date | null
  /** Whether calculation was successful */
  success: boolean
  /** Error message if calculation failed */
  error?: string
}

/**
 * Parse time string (HH:MM) and date to create a Date object
 */
function parseTimeToDate(dateStr: string, timeStr: string, isZulu: boolean = true): Date | null {
  if (!dateStr || !timeStr) return null
  
  // Parse the time
  const timeParts = timeStr.trim().split(':')
  if (timeParts.length < 2) return null
  
  const hours = parseInt(timeParts[0], 10)
  const minutes = parseInt(timeParts[1], 10)
  
  if (isNaN(hours) || isNaN(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  
  // Parse the date
  const dateParts = dateStr.split('-')
  if (dateParts.length !== 3) return null
  
  const year = parseInt(dateParts[0], 10)
  const month = parseInt(dateParts[1], 10) - 1 // JS months are 0-indexed
  const day = parseInt(dateParts[2], 10)
  
  if (isZulu) {
    return new Date(Date.UTC(year, month, day, hours, minutes, 0))
  } else {
    return new Date(year, month, day, hours, minutes, 0)
  }
}

/**
 * Calculate the overlap between two time periods in milliseconds
 */
function getOverlapMs(start1: Date, end1: Date, start2: Date, end2: Date): number {
  const overlapStart = Math.max(start1.getTime(), start2.getTime())
  const overlapEnd = Math.min(end1.getTime(), end2.getTime())
  return Math.max(0, overlapEnd - overlapStart)
}

/**
 * Calculate night time using Option 2: Union of night periods from both locations
 * 
 * This calculates twilight at both departure and destination locations,
 * determines which night periods the flight overlaps with at each location,
 * and takes the union of all overlapping periods.
 */
function calculateNightTimeWithTwoLocations(
  flightDate: Date,
  outDate: Date,
  inDate: Date,
  depLatitude: number,
  depLongitude: number,
  destLatitude: number,
  destLongitude: number,
  totalHours: number
): NightTimeResult {
  console.log('[NightTimeCalc] Two-location calculation:', {
    flightDate: flightDate.toISOString(),
    outDate: outDate.toISOString(),
    inDate: inDate.toISOString(),
    depLatitude,
    depLongitude,
    destLatitude,
    destLongitude,
    totalHours
  })
  
  // Calculate twilight at departure location
  const depTwilight = getCivilTwilight(flightDate, depLatitude, depLongitude)
  console.log('[NightTimeCalc] Departure twilight:', {
    eveningEnd: depTwilight.eveningEnd?.toISOString(),
    morningStart: depTwilight.morningStart?.toISOString(),
    isPolarDay: depTwilight.isPolarDay,
    isPolarNight: depTwilight.isPolarNight
  })
  
  // Calculate twilight at destination location
  const destTwilight = getCivilTwilight(flightDate, destLatitude, destLongitude)
  console.log('[NightTimeCalc] Destination twilight:', {
    eveningEnd: destTwilight.eveningEnd?.toISOString(),
    morningStart: destTwilight.morningStart?.toISOString(),
    isPolarDay: destTwilight.isPolarDay,
    isPolarNight: destTwilight.isPolarNight
  })
  
  // Handle polar cases
  if (depTwilight.isPolarNight || destTwilight.isPolarNight) {
    // If either location is in polar night, entire flight is night
    return {
      nightHours: totalHours,
      totalHours,
      eveningTwilight: depTwilight.eveningEnd || destTwilight.eveningEnd,
      morningTwilight: depTwilight.morningStart || destTwilight.morningStart,
      success: true
    }
  }
  
  if (depTwilight.isPolarDay && destTwilight.isPolarDay) {
    // If both locations are in polar day, no night time
    return {
      nightHours: 0,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: true
    }
  }
  
  // Set up midnight boundaries
  const midnightSameDay = new Date(Date.UTC(
    flightDate.getUTCFullYear(),
    flightDate.getUTCMonth(),
    flightDate.getUTCDate() + 1,
    0, 0, 0
  ))
  
  const midnightPrevDay = new Date(Date.UTC(
    flightDate.getUTCFullYear(),
    flightDate.getUTCMonth(),
    flightDate.getUTCDate(),
    0, 0, 0
  ))
  
  // Collect all night periods from both locations
  const nightPeriods: Array<{ start: Date; end: Date }> = []
  
  // Departure location night periods
  if (depTwilight.eveningEnd && depTwilight.morningStart && 
      !depTwilight.isPolarDay && !depTwilight.isPolarNight) {
    // Evening night period: evening twilight end -> midnight
    if (depTwilight.eveningEnd.getTime() < midnightSameDay.getTime()) {
      nightPeriods.push({
        start: depTwilight.eveningEnd,
        end: midnightSameDay
      })
    }
    // Morning night period: midnight -> morning twilight start
    nightPeriods.push({
      start: midnightPrevDay,
      end: depTwilight.morningStart
    })
  }
  
  // Destination location night periods
  if (destTwilight.eveningEnd && destTwilight.morningStart && 
      !destTwilight.isPolarDay && !destTwilight.isPolarNight) {
    // Evening night period: evening twilight end -> midnight
    if (destTwilight.eveningEnd.getTime() < midnightSameDay.getTime()) {
      nightPeriods.push({
        start: destTwilight.eveningEnd,
        end: midnightSameDay
      })
    }
    // Morning night period: midnight -> morning twilight start
    nightPeriods.push({
      start: midnightPrevDay,
      end: destTwilight.morningStart
    })
  }
  
  // Handle next day if flight spans to next day
  if (inDate.getTime() > midnightSameDay.getTime()) {
    const nextDayDate = new Date(flightDate.getTime() + 24 * 60 * 60 * 1000)
    const nextMidnight = new Date(Date.UTC(
      nextDayDate.getUTCFullYear(),
      nextDayDate.getUTCMonth(),
      nextDayDate.getUTCDate() + 1,
      0, 0, 0
    ))
    
    // Next day twilight at departure
    const nextDepTwilight = getCivilTwilight(nextDayDate, depLatitude, depLongitude)
    if (nextDepTwilight.morningStart && !nextDepTwilight.isPolarDay && !nextDepTwilight.isPolarNight) {
      nightPeriods.push({
        start: midnightSameDay,
        end: nextDepTwilight.morningStart
      })
    }
    
    // Next day twilight at destination
    const nextDestTwilight = getCivilTwilight(nextDayDate, destLatitude, destLongitude)
    if (nextDestTwilight.morningStart && !nextDestTwilight.isPolarDay && !nextDestTwilight.isPolarNight) {
      nightPeriods.push({
        start: midnightSameDay,
        end: nextDestTwilight.morningStart
      })
    }
  }
  
  // Calculate total overlap by merging overlapping periods and summing
  // Sort periods by start time
  nightPeriods.sort((a, b) => a.start.getTime() - b.start.getTime())
  
  // Merge overlapping periods
  const mergedPeriods: Array<{ start: Date; end: Date }> = []
  for (const period of nightPeriods) {
    if (mergedPeriods.length === 0) {
      mergedPeriods.push({ ...period })
      continue
    }
    
    const lastPeriod = mergedPeriods[mergedPeriods.length - 1]
    // If this period overlaps or is adjacent to the last one, merge them
    if (period.start.getTime() <= lastPeriod.end.getTime()) {
      lastPeriod.end = new Date(Math.max(lastPeriod.end.getTime(), period.end.getTime()))
    } else {
      mergedPeriods.push({ ...period })
    }
  }
  
  // Calculate total overlap between flight and all merged night periods
  let totalNightMs = 0
  console.log('[NightTimeCalc] Merged night periods:', mergedPeriods.map(p => ({
    start: p.start.toISOString(),
    end: p.end.toISOString()
  })))
  
  for (const period of mergedPeriods) {
    const overlap = getOverlapMs(outDate, inDate, period.start, period.end)
    console.log('[NightTimeCalc] Overlap with period:', {
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      flightStart: outDate.toISOString(),
      flightEnd: inDate.toISOString(),
      overlapMs: overlap,
      overlapHours: overlap / (1000 * 60 * 60)
    })
    totalNightMs += overlap
  }
  
  const nightHours = totalNightMs / (1000 * 60 * 60)
  console.log('[NightTimeCalc] Total night time:', nightHours, 'hours')
  
  // Use departure twilight times for return value (or destination if departure unavailable)
  const eveningTwilight = depTwilight.eveningEnd || destTwilight.eveningEnd
  const morningTwilight = depTwilight.morningStart || destTwilight.morningStart
  
  const result = {
    nightHours: Math.round(nightHours * 10) / 10, // Round to 1 decimal
    totalHours: Math.round(totalHours * 10) / 10,
    eveningTwilight,
    morningTwilight,
    success: true
  }
  
  console.log('[NightTimeCalc] Final result:', result)
  return result
}

/**
 * Calculate night time for a flight
 * 
 * This uses a simplified approach:
 * 1. Get civil twilight times for departure location on flight date
 * 2. If flight crosses midnight, also consider next day's twilight
 * 3. Calculate overlap between flight time and night periods
 * 
 * For more accuracy on long flights, the destination coordinates can be provided
 * to interpolate twilight times along the route.
 */
export function calculateNightTime(params: NightTimeParams): NightTimeResult {
  const { 
    date, 
    depLatitude, 
    depLongitude, 
    destLatitude, 
    destLongitude, 
    outTime, 
    inTime, 
    isZulu = true 
  } = params
  
  // Validate required params
  if (!date || !outTime || !inTime) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Missing required parameters (date, outTime, or inTime)'
    }
  }
  
  if (isNaN(depLatitude) || isNaN(depLongitude)) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Invalid departure coordinates'
    }
  }
  
  // Parse times
  const outDate = parseTimeToDate(date, outTime, isZulu)
  let inDate = parseTimeToDate(date, inTime, isZulu)
  
  if (!outDate || !inDate) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Invalid time format'
    }
  }
  
  // Handle flights that cross midnight
  if (inDate.getTime() < outDate.getTime()) {
    // In time is on the next day
    inDate = new Date(inDate.getTime() + 24 * 60 * 60 * 1000)
  }
  
  // Calculate total flight time
  const totalMs = inDate.getTime() - outDate.getTime()
  const totalHours = totalMs / (1000 * 60 * 60)
  
  const flightDate = new Date(date + 'T12:00:00Z')
  
  // Option 2: If both departure and destination coordinates are provided,
  // calculate twilight at both locations and take union of night periods
  if (destLatitude !== undefined && destLongitude !== undefined && 
      !isNaN(destLatitude) && !isNaN(destLongitude)) {
    return calculateNightTimeWithTwoLocations(
      flightDate,
      outDate,
      inDate,
      depLatitude,
      depLongitude,
      destLatitude,
      destLongitude,
      totalHours
    )
  }
  
  // Fallback: Use single location (departure only)
  console.log('[NightTimeCalc] Using single-location calculation (departure only)')
  const twilight = getCivilTwilight(flightDate, depLatitude, depLongitude)
  console.log('[NightTimeCalc] Single-location twilight:', {
    eveningEnd: twilight.eveningEnd?.toISOString(),
    morningStart: twilight.morningStart?.toISOString(),
    isPolarDay: twilight.isPolarDay,
    isPolarNight: twilight.isPolarNight
  })
  
  // Handle polar cases
  if (twilight.isPolarNight) {
    console.log('[NightTimeCalc] Polar night detected - entire flight is night')
    return {
      nightHours: totalHours,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: true
    }
  }
  
  if (twilight.isPolarDay) {
    console.log('[NightTimeCalc] Polar day detected - no night time')
    return {
      nightHours: 0,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: true
    }
  }
  
  if (!twilight.eveningEnd || !twilight.morningStart) {
    console.error('[NightTimeCalc] Unable to calculate twilight times')
    return {
      nightHours: 0,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Unable to calculate twilight times'
    }
  }
  
  // Calculate night time overlaps for single location
  let nightMs = 0
  
  // Night period 1: From evening twilight end to midnight (same day)
  const midnightSameDay = new Date(Date.UTC(
    flightDate.getUTCFullYear(),
    flightDate.getUTCMonth(),
    flightDate.getUTCDate() + 1,
    0, 0, 0
  ))
  
  // Night period 2: From midnight to morning twilight start (next morning)
  const midnightPrevDay = new Date(Date.UTC(
    flightDate.getUTCFullYear(),
    flightDate.getUTCMonth(),
    flightDate.getUTCDate(),
    0, 0, 0
  ))
  
  // Check overlap with evening night period (evening twilight -> midnight)
  if (twilight.eveningEnd.getTime() < midnightSameDay.getTime()) {
    const eveningOverlap = getOverlapMs(outDate, inDate, twilight.eveningEnd, midnightSameDay)
    console.log('[NightTimeCalc] Evening night period overlap:', {
      periodStart: twilight.eveningEnd.toISOString(),
      periodEnd: midnightSameDay.toISOString(),
      overlapHours: eveningOverlap / (1000 * 60 * 60)
    })
    nightMs += eveningOverlap
  }
  
  // Check overlap with morning night period (midnight -> morning twilight)
  const morningOverlap = getOverlapMs(outDate, inDate, midnightPrevDay, twilight.morningStart)
  console.log('[NightTimeCalc] Morning night period overlap:', {
    periodStart: midnightPrevDay.toISOString(),
    periodEnd: twilight.morningStart.toISOString(),
    flightStart: outDate.toISOString(),
    flightEnd: inDate.toISOString(),
    overlapHours: morningOverlap / (1000 * 60 * 60)
  })
  nightMs += morningOverlap
  
  // If flight spans to next day, check next day's twilight too
  if (inDate.getTime() > midnightSameDay.getTime()) {
    console.log('[NightTimeCalc] Flight spans to next day, checking next day twilight')
    const nextDayDate = new Date(flightDate.getTime() + 24 * 60 * 60 * 1000)
    const nextTwilight = getCivilTwilight(nextDayDate, depLatitude, depLongitude)
    
    if (nextTwilight.morningStart && !nextTwilight.isPolarDay && !nextTwilight.isPolarNight) {
      // Morning night period of next day (midnight -> morning twilight)
      const nextDayOverlap = getOverlapMs(outDate, inDate, midnightSameDay, nextTwilight.morningStart)
      console.log('[NightTimeCalc] Next day morning overlap:', {
        periodStart: midnightSameDay.toISOString(),
        periodEnd: nextTwilight.morningStart.toISOString(),
        overlapHours: nextDayOverlap / (1000 * 60 * 60)
      })
      nightMs += nextDayOverlap
    }
  }
  
  const nightHours = nightMs / (1000 * 60 * 60)
  console.log('[NightTimeCalc] Single-location total night time:', nightHours, 'hours')
  
  return {
    nightHours: Math.round(nightHours * 10) / 10, // Round to 1 decimal
    totalHours: Math.round(totalHours * 10) / 10,
    eveningTwilight: twilight.eveningEnd,
    morningTwilight: twilight.morningStart,
    success: true
  }
}

/**
 * Quick check if a flight might have night time based on rough time estimates
 * Useful for showing a hint to the user
 */
export function mightHaveNightTime(outTime: string, inTime: string): boolean {
  if (!outTime || !inTime) return false
  
  const outParts = outTime.split(':')
  const inParts = inTime.split(':')
  
  if (outParts.length < 2 || inParts.length < 2) return false
  
  const outHour = parseInt(outParts[0], 10)
  const inHour = parseInt(inParts[0], 10)
  
  // Rough check: if flight includes hours typically after sunset or before sunrise
  // This is just a hint - actual calculation uses proper civil twilight
  const eveningStart = 17 // 5 PM UTC - rough evening start
  const morningEnd = 7 // 7 AM UTC - rough morning end
  
  // Handle midnight crossing
  if (inHour < outHour) {
    // Flight crosses midnight - likely has some night
    return true
  }
  
  // Check if flight spans evening or early morning hours
  return outHour >= eveningStart || inHour <= morningEnd || outHour <= morningEnd
}
