/**
 * FAR 61.57(b) night landing: a landing during the period beginning 1 hour
 * after sunset and ending 1 hour before sunrise, evaluated at the arrival
 * airport. This is not FAR 1.1 civil-twilight night TIME.
 *
 * Airline Autofi legs are treated as one full-stop landing at the destination.
 */

import { getSunTimes } from './solarCalculator'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/**
 * Inclusive window: landing at exactly 1 hour after sunset or 1 hour before
 * sunrise counts as a night landing.
 */
export function isFarNightLanding(
  landing: Date,
  latitude: number,
  longitude: number
): boolean {
  if (Number.isNaN(landing.getTime()) || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return false
  }

  const landingMs = landing.getTime()
  const startDay = utcDayStart(addUtcDays(landing, -1))
  const endDay = utcDayStart(addUtcDays(landing, 1))

  for (let day = startDay; day.getTime() <= endDay.getTime(); day = addUtcDays(day, 1)) {
    const times = getSunTimes(day, latitude, longitude)
    const nextTimes = getSunTimes(addUtcDays(day, 1), latitude, longitude)

    if (times.isPolarNight) {
      if (landingMs >= day.getTime() && landingMs < addUtcDays(day, 1).getTime()) return true
      continue
    }
    if (times.isPolarDay) continue
    if (!times.sunset) continue

    const windowStart = times.sunset.getTime() + HOUR_MS
    const nextSunrise = nextTimes.sunrise
    if (!nextSunrise) {
      // No sunrise the following day (polar night starting): night after sunset+1h.
      if (landingMs >= windowStart) return true
      continue
    }
    const windowEnd = nextSunrise.getTime() - HOUR_MS
    if (windowEnd < windowStart) continue
    if (landingMs >= windowStart && landingMs <= windowEnd) return true
  }

  return false
}
