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
  
  // Use average position for twilight calculation if destination provided
  const avgLat = destLatitude !== undefined ? (depLatitude + destLatitude) / 2 : depLatitude
  const avgLon = destLongitude !== undefined ? (depLongitude + destLongitude) / 2 : depLongitude
  
  // Get civil twilight for the flight date
  const flightDate = new Date(date + 'T12:00:00Z')
  const twilight = getCivilTwilight(flightDate, avgLat, avgLon)
  
  // Handle polar cases
  if (twilight.isPolarNight) {
    return {
      nightHours: totalHours,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: true
    }
  }
  
  if (twilight.isPolarDay) {
    return {
      nightHours: 0,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: true
    }
  }
  
  if (!twilight.eveningEnd || !twilight.morningStart) {
    return {
      nightHours: 0,
      totalHours,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Unable to calculate twilight times'
    }
  }
  
  // Calculate night time overlaps
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
    nightMs += getOverlapMs(outDate, inDate, twilight.eveningEnd, midnightSameDay)
  }
  
  // Check overlap with morning night period (midnight -> morning twilight)
  nightMs += getOverlapMs(outDate, inDate, midnightPrevDay, twilight.morningStart)
  
  // If flight spans to next day, check next day's twilight too
  if (inDate.getTime() > midnightSameDay.getTime()) {
    const nextDayDate = new Date(flightDate.getTime() + 24 * 60 * 60 * 1000)
    const nextTwilight = getCivilTwilight(nextDayDate, avgLat, avgLon)
    
    if (nextTwilight.morningStart && !nextTwilight.isPolarDay && !nextTwilight.isPolarNight) {
      // Morning night period of next day (midnight -> morning twilight)
      nightMs += getOverlapMs(outDate, inDate, midnightSameDay, nextTwilight.morningStart)
    }
  }
  
  const nightHours = nightMs / (1000 * 60 * 60)
  
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
