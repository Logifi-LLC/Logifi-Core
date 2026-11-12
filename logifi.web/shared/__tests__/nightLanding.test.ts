import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { isFarNightLanding } from '../nightLanding'
import { getSunTimes } from '../solarCalculator'

const KLAX = { lat: 33.9425, lon: -118.4081, tz: 'America/Los_Angeles' }

describe('isFarNightLanding FAR 61.57(b)', () => {
  it('is a night landing at exactly 1 hour after sunset, not 1 minute before', () => {
    // NOAA/timeanddate KLAX 2026-11-12 sunset ~16:51 PST. Window starts 17:51.
    const times = getSunTimes(new Date('2026-11-12T12:00:00Z'), KLAX.lat, KLAX.lon)
    expect(times.sunset).not.toBeNull()
    const start = DateTime.fromJSDate(times.sunset!, { zone: 'utc' }).plus({ hours: 1 })
    expect(isFarNightLanding(start.toJSDate(), KLAX.lat, KLAX.lon)).toBe(true)
    expect(
      isFarNightLanding(start.minus({ minutes: 1 }).toJSDate(), KLAX.lat, KLAX.lon)
    ).toBe(false)
  })

  it('is a night landing at exactly 1 hour before sunrise, not 1 minute after', () => {
    const times = getSunTimes(new Date('2026-11-13T12:00:00Z'), KLAX.lat, KLAX.lon)
    expect(times.sunrise).not.toBeNull()
    const end = DateTime.fromJSDate(times.sunrise!, { zone: 'utc' }).minus({ hours: 1 })
    expect(isFarNightLanding(end.toJSDate(), KLAX.lat, KLAX.lon)).toBe(true)
    expect(
      isFarNightLanding(end.plus({ minutes: 1 }).toJSDate(), KLAX.lat, KLAX.lon)
    ).toBe(false)
  })

  it('afternoon LAX arrival is not a night landing even if night TIME is miscomputed', () => {
    const landing = DateTime.fromObject(
      { year: 2026, month: 11, day: 12, hour: 16, minute: 45 },
      { zone: KLAX.tz }
    ).toJSDate()
    expect(isFarNightLanding(landing, KLAX.lat, KLAX.lon)).toBe(false)
  })

  it('late evening LAX arrival after sunset+1h is a night landing', () => {
    const landing = DateTime.fromObject(
      { year: 2026, month: 11, day: 12, hour: 18, minute: 30 },
      { zone: KLAX.tz }
    ).toJSDate()
    expect(isFarNightLanding(landing, KLAX.lat, KLAX.lon)).toBe(true)
  })
})
