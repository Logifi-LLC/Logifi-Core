/**
 * Solar Calculator - NOAA Algorithm Implementation
 * Calculates civil twilight times for a given date and location
 * 
 * Civil twilight is when the sun is 6 degrees below the horizon.
 * FAA defines "night" as the time between the end of evening civil twilight
 * and the beginning of morning civil twilight.
 */

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Convert radians to degrees
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Calculate the Julian Day from a Date object
 */
function getJulianDay(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

/**
 * Calculate the Julian Century from Julian Day
 */
function getJulianCentury(julianDay: number): number {
  return (julianDay - 2451545) / 36525
}

/**
 * Calculate the geometric mean longitude of the sun (degrees)
 */
function getSunGeomMeanLong(julianCentury: number): number {
  let L0 = 280.46646 + julianCentury * (36000.76983 + 0.0003032 * julianCentury)
  while (L0 > 360) L0 -= 360
  while (L0 < 0) L0 += 360
  return L0
}

/**
 * Calculate the geometric mean anomaly of the sun (degrees)
 */
function getSunGeomMeanAnomaly(julianCentury: number): number {
  return 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury)
}

/**
 * Calculate the eccentricity of Earth's orbit
 */
function getEccentricityEarthOrbit(julianCentury: number): number {
  return 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury)
}

/**
 * Calculate the equation of center for the sun (degrees)
 */
function getSunEqOfCenter(julianCentury: number): number {
  const m = getSunGeomMeanAnomaly(julianCentury)
  const mRad = toRadians(m)
  const sinM = Math.sin(mRad)
  const sin2M = Math.sin(2 * mRad)
  const sin3M = Math.sin(3 * mRad)
  
  return sinM * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
         sin2M * (0.019993 - 0.000101 * julianCentury) +
         sin3M * 0.000289
}

/**
 * Calculate the sun's true longitude (degrees)
 */
function getSunTrueLong(julianCentury: number): number {
  return getSunGeomMeanLong(julianCentury) + getSunEqOfCenter(julianCentury)
}

/**
 * Calculate the sun's apparent longitude (degrees)
 */
function getSunApparentLong(julianCentury: number): number {
  const o = getSunTrueLong(julianCentury)
  const omega = 125.04 - 1934.136 * julianCentury
  return o - 0.00569 - 0.00478 * Math.sin(toRadians(omega))
}

/**
 * Calculate the mean obliquity of the ecliptic (degrees)
 */
function getMeanObliquityOfEcliptic(julianCentury: number): number {
  const seconds = 21.448 - julianCentury * (46.8150 + julianCentury * (0.00059 - julianCentury * 0.001813))
  return 23 + (26 + seconds / 60) / 60
}

/**
 * Calculate the corrected obliquity of the ecliptic (degrees)
 */
function getObliquityCorrection(julianCentury: number): number {
  const e0 = getMeanObliquityOfEcliptic(julianCentury)
  const omega = 125.04 - 1934.136 * julianCentury
  return e0 + 0.00256 * Math.cos(toRadians(omega))
}

/**
 * Calculate the sun's declination (degrees)
 */
function getSunDeclination(julianCentury: number): number {
  const e = getObliquityCorrection(julianCentury)
  const lambda = getSunApparentLong(julianCentury)
  const sint = Math.sin(toRadians(e)) * Math.sin(toRadians(lambda))
  return toDegrees(Math.asin(sint))
}

/**
 * Calculate the equation of time (minutes)
 */
function getEquationOfTime(julianCentury: number): number {
  const e = getObliquityCorrection(julianCentury)
  const l0 = getSunGeomMeanLong(julianCentury)
  const eOrbit = getEccentricityEarthOrbit(julianCentury)
  const m = getSunGeomMeanAnomaly(julianCentury)
  
  let y = Math.tan(toRadians(e) / 2)
  y = y * y
  
  const sin2L0 = Math.sin(2 * toRadians(l0))
  const sinM = Math.sin(toRadians(m))
  const cos2L0 = Math.cos(2 * toRadians(l0))
  const sin4L0 = Math.sin(4 * toRadians(l0))
  const sin2M = Math.sin(2 * toRadians(m))
  
  const eTime = y * sin2L0 - 2 * eOrbit * sinM + 4 * eOrbit * y * sinM * cos2L0 -
                0.5 * y * y * sin4L0 - 1.25 * eOrbit * eOrbit * sin2M
  
  return toDegrees(eTime) * 4 // Convert to minutes
}

/**
 * Calculate the hour angle for a given zenith angle
 * @param lat Latitude in degrees
 * @param declination Sun declination in degrees
 * @param zenith Zenith angle in degrees (96 for civil twilight)
 * @returns Hour angle in degrees, or null if sun never reaches this angle
 */
function getHourAngle(lat: number, declination: number, zenith: number): number | null {
  const latRad = toRadians(lat)
  const decRad = toRadians(declination)
  const zenithRad = toRadians(zenith)
  
  const cosHA = (Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decRad))) -
                Math.tan(latRad) * Math.tan(decRad)
  
  // Check if the sun reaches the zenith angle at this location
  if (cosHA > 1 || cosHA < -1) {
    return null // Sun never reaches this angle (polar day/night)
  }
  
  return toDegrees(Math.acos(cosHA))
}

/**
 * Calculate solar noon in UTC minutes from midnight
 */
function getSolarNoon(longitude: number, julianCentury: number): number {
  const eqTime = getEquationOfTime(julianCentury)
  return 720 - 4 * longitude - eqTime
}

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
 * Calculate civil twilight times for a given date and location
 * @param date The date to calculate for
 * @param latitude Latitude in degrees (positive = North)
 * @param longitude Longitude in degrees (positive = East)
 * @returns Civil twilight times in UTC
 */
export function getCivilTwilight(date: Date, latitude: number, longitude: number): CivilTwilightTimes {
  // Civil twilight zenith angle (sun 6 degrees below horizon)
  const CIVIL_TWILIGHT_ZENITH = 96
  
  // Get Julian Day for noon on the given date
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const noonDate = new Date(Date.UTC(year, month, day, 12, 0, 0))
  
  const julianDay = getJulianDay(noonDate)
  const julianCentury = getJulianCentury(julianDay)
  
  // Get sun declination and equation of time
  const declination = getSunDeclination(julianCentury)
  const eqTime = getEquationOfTime(julianCentury)
  
  // Calculate hour angle for civil twilight
  const hourAngle = getHourAngle(latitude, declination, CIVIL_TWILIGHT_ZENITH)
  
  if (hourAngle === null) {
    // Check if it's polar day or polar night
    const noonAltitude = 90 - latitude + declination
    if (noonAltitude > 90 - CIVIL_TWILIGHT_ZENITH + 90) {
      return {
        eveningEnd: null,
        morningStart: null,
        isPolarDay: true,
        isPolarNight: false
      }
    } else {
      return {
        eveningEnd: null,
        morningStart: null,
        isPolarDay: false,
        isPolarNight: true
      }
    }
  }
  
  // Calculate solar noon
  const solarNoon = 720 - 4 * longitude - eqTime // minutes from midnight UTC
  
  // Morning civil twilight start (before sunrise)
  const morningMinutes = solarNoon - hourAngle * 4
  const morningStart = new Date(Date.UTC(year, month, day))
  morningStart.setUTCMinutes(Math.round(morningMinutes))
  
  // Evening civil twilight end (after sunset)
  const eveningMinutes = solarNoon + hourAngle * 4
  const eveningEnd = new Date(Date.UTC(year, month, day))
  eveningEnd.setUTCMinutes(Math.round(eveningMinutes))
  
  return {
    eveningEnd,
    morningStart,
    isPolarDay: false,
    isPolarNight: false
  }
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

