/**
 * Solar times via SunCalc.
 *
 * FAR 1.1 night (time): end of evening civil twilight → start of morning civil
 * twilight. Civil twilight = sun 6° below the horizon.
 *
 * FAR 61.57(b) night landings use sunset / sunrise (not civil twilight).
 */

import SunCalc from 'suncalc'

// SunCalc default dawn/dusk are already -6°, but we register named civil
// times so callers do not depend on that default.
SunCalc.addTime(-6, 'civilDawn', 'civilDusk')

export interface CivilTwilightTimes {
  /** Evening civil twilight end (sun 6° below horizon) — UTC Date */
  eveningEnd: Date | null
  /** Morning civil twilight start (sun rises to 6° below horizon) — UTC Date */
  morningStart: Date | null
  isPolarDay: boolean
  isPolarNight: boolean
}

export interface SunTimes {
  sunrise: Date | null
  sunset: Date | null
  eveningCivil: Date | null
  morningCivil: Date | null
  isPolarDay: boolean
  isPolarNight: boolean
}

function isValidDate(value: Date | undefined | null): value is Date {
  return !!value && !Number.isNaN(value.getTime())
}

/**
 * SunCalc keys off the Date's calendar day. Pass noon UTC for the Y-M-D we
 * care about so the day does not shift with the host timezone.
 */
function noonUtcForDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0))
}

function checkPolarCase(date: Date, latitude: number, longitude: number): {
  isPolarDay: boolean
  isPolarNight: boolean
} {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const civilTwilightAltitude = -6
  const testHours = [0, 6, 12, 18]
  let allAbove = true
  let allBelow = true

  for (const hour of testHours) {
    const pos = SunCalc.getPosition(new Date(Date.UTC(year, month, day, hour, 0, 0)), latitude, longitude)
    const altitudeDeg = pos.altitude * (180 / Math.PI)
    if (altitudeDeg > civilTwilightAltitude) allBelow = false
    else allAbove = false
  }

  if (allAbove) return { isPolarDay: true, isPolarNight: false }
  if (allBelow) return { isPolarDay: false, isPolarNight: true }
  return { isPolarDay: false, isPolarNight: false }
}

export function getSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  const lat = typeof latitude === 'number' ? latitude : Number.parseFloat(String(latitude))
  const lon = typeof longitude === 'number' ? longitude : Number.parseFloat(String(longitude))

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return {
      sunrise: null,
      sunset: null,
      eveningCivil: null,
      morningCivil: null,
      isPolarDay: false,
      isPolarNight: false,
    }
  }

  const localDate = noonUtcForDate(date)
  const times = SunCalc.getTimes(localDate, lat, lon) as Record<string, Date | undefined>

  const civilDusk = times.civilDusk ?? times.dusk
  const civilDawn = times.civilDawn ?? times.dawn
  const sunrise = times.sunrise
  const sunset = times.sunset

  const civilOk = isValidDate(civilDusk) && isValidDate(civilDawn)
  if (!civilOk) {
    const polar = checkPolarCase(localDate, lat, lon)
    return {
      sunrise: isValidDate(sunrise) ? new Date(sunrise.getTime()) : null,
      sunset: isValidDate(sunset) ? new Date(sunset.getTime()) : null,
      eveningCivil: null,
      morningCivil: null,
      isPolarDay: polar.isPolarDay,
      isPolarNight: polar.isPolarNight,
    }
  }

  return {
    sunrise: isValidDate(sunrise) ? new Date(sunrise.getTime()) : null,
    sunset: isValidDate(sunset) ? new Date(sunset.getTime()) : null,
    eveningCivil: new Date(civilDusk.getTime()),
    morningCivil: new Date(civilDawn.getTime()),
    isPolarDay: false,
    isPolarNight: false,
  }
}

export function getCivilTwilight(date: Date, latitude: number, longitude: number): CivilTwilightTimes {
  const times = getSunTimes(date, latitude, longitude)
  return {
    eveningEnd: times.eveningCivil,
    morningStart: times.morningCivil,
    isPolarDay: times.isPolarDay,
    isPolarNight: times.isPolarNight,
  }
}

/**
 * True if `time` is after that day's dusk or before that day's dawn.
 * Do not use across midnight — prefer night intervals in nightTimeCalculator.
 */
export function isNightTime(time: Date, twilight: CivilTwilightTimes): boolean {
  if (twilight.isPolarNight) return true
  if (twilight.isPolarDay) return false
  if (!twilight.eveningEnd || !twilight.morningStart) return false
  const timeMs = time.getTime()
  return timeMs >= twilight.eveningEnd.getTime() || timeMs < twilight.morningStart.getTime()
}
