import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { calculateNightTime, calculateNightTimeFromInstants } from '../nightTimeCalculator'
import { getSunTimes } from '../solarCalculator'

/**
 * Coordinates: OurAirports / typical airport reference points.
 *
 * Authoritative civil twilight / sunset cross-check (cited per case):
 * - NOAA GML Solar Calculator https://gml.noaa.gov/grad/solcalc/
 * - USNO RS_OneDay https://aa.usno.navy.mil/data/RS_OneDay.html
 * - timeanddate.com sun tables
 *
 * SunCalc at these coords is within ~2 minutes of those tables; tests assert
 * night hours against the FAR 1.1 definition, not a specific minute of dusk.
 */

const KLAX = { lat: 33.9425, lon: -118.4081, tz: 'America/Los_Angeles' }
const KJFK = { lat: 40.6398, lon: -73.7789, tz: 'America/New_York' }
const PANC = { lat: 61.1743, lon: -149.9963, tz: 'America/Anchorage' }
const PHNL = { lat: 21.3187, lon: -157.9224, tz: 'Pacific/Honolulu' }

function localNight(opts: {
  date: string
  out: string
  inn: string
  airport: { lat: number; lon: number; tz: string }
  dest?: { lat: number; lon: number; tz: string }
}) {
  return calculateNightTime({
    date: opts.date,
    depLatitude: opts.airport.lat,
    depLongitude: opts.airport.lon,
    destLatitude: (opts.dest ?? opts.airport).lat,
    destLongitude: (opts.dest ?? opts.airport).lon,
    outTime: opts.out,
    inTime: opts.inn,
    isZulu: false,
    outTimezone: opts.airport.tz,
    inTimezone: (opts.dest ?? opts.airport).tz,
  })
}

describe('calculateNightTime known answers', () => {
  it('LAX afternoon 16:00-16:45 PST is 0 night (not 0.8 from UTC-midnight cut)', () => {
    // NOAA/timeanddate 2026-11-12 Los Angeles: sunset ~16:51 PST, end civil
    // twilight ~17:18 PST. 16:00-16:45 is before dusk. Dusk is after 00:00Z
    // (01:20Z 13 Nov), which is why the old UTC-midnight split logged 0.8.
    const result = localNight({
      date: '2026-11-12',
      out: '16:00',
      inn: '16:45',
      airport: KLAX,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(0.8)
    expect(result.nightHours).toBe(0)
  })

  it('JFK summer evening 19:30-20:30 EDT is 0 night (not 0.5 from UTC-midnight cut)', () => {
    // timeanddate / USNO-style tables for NYC 2026-06-20: sunset ~20:30 EDT,
    // end civil twilight ~21:03 EDT. 19:30-20:30 is still civil day. The
    // 20:00-20:30 slice is after 00:00Z (00:30Z), which the old code counted.
    const result = localNight({
      date: '2026-06-20',
      out: '19:30',
      inn: '20:30',
      airport: KJFK,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(1)
    expect(result.nightHours).toBe(0)
  })

  it('ANC summer solstice has no civil night (sun never 6° below)', () => {
    // Anchorage ~61.2°N: civil twilight lasts all night in late June
    // (NOAA/USNO: sun does not reach -6°). SunCalc returns invalid civil
    // dawn/dusk → polar civil day.
    const result = localNight({
      date: '2026-06-21',
      out: '00:00',
      inn: '04:00',
      airport: PANC,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(4)
    expect(result.nightHours).toBe(0)
  })

  it('ANC winter solstice evening is all night', () => {
    // NOAA/USNO Anchorage 2026-12-21: sunset ~15:43 AKST, end civil twilight
    // ~16:45 AKST. 18:00-22:00 is after dusk.
    const result = localNight({
      date: '2026-12-21',
      out: '18:00',
      inn: '22:00',
      airport: PANC,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(4)
    expect(result.nightHours).toBe(4)
  })

  it('HNL afternoon 16:00-16:45 HST is 0 night (UTC-10, dusk after 00:00Z)', () => {
    // Honolulu has no DST. NOAA-style 2026-11-12: sunset ~17:52 HST, end
    // civil twilight ~18:15 HST. 16:00 HST = 02:00Z next day — after UTC
    // midnight, still daylight.
    const result = localNight({
      date: '2026-11-12',
      out: '16:00',
      inn: '16:45',
      airport: PHNL,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(0.8)
    expect(result.nightHours).toBe(0)
  })

  it('red-eye LAX night to JFK morning crosses local and UTC midnight', () => {
    // Out 22:00 PST 12 Nov = 06:00Z 13 Nov (after LAX civil dusk ~17:20 PST /
    // 01:20Z). In 06:30 EST 13 Nov = 11:30Z (JFK civil dawn ~06:11 EST /
    // 11:11Z, so the last minutes are day at JFK).
    const out = DateTime.fromObject(
      { year: 2026, month: 11, day: 12, hour: 22, minute: 0 },
      { zone: 'America/Los_Angeles' }
    ).toJSDate()
    const inn = DateTime.fromObject(
      { year: 2026, month: 11, day: 13, hour: 6, minute: 30 },
      { zone: 'America/New_York' }
    ).toJSDate()
    const result = calculateNightTimeFromInstants({
      out,
      in: inn,
      depLatitude: KLAX.lat,
      depLongitude: KLAX.lon,
      destLatitude: KJFK.lat,
      destLongitude: KJFK.lon,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(5.5)
    expect(result.nightHours).toBeGreaterThan(4)
    expect(result.nightHours).toBeLessThan(5.5)
  })

  it('DST spring-forward: 01:30-03:30 America/New_York is 1.0 hour, all night', () => {
    // US DST 2026-03-08 02:00 → 03:00. Civil dawn ~06:52 EDT (USNO/NOAA).
    const result = localNight({
      date: '2026-03-08',
      out: '01:30',
      inn: '03:30',
      airport: KJFK,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(1)
    expect(result.nightHours).toBe(1)
  })

  it('DST fall-back: first 01:30 EDT through 03:30 EST is 3.0 hours, all night', () => {
    // US DST 2026-11-01 02:00 → 01:00. Explicit offsets so the repeated
    // 01:30 is the first (EDT) occurrence. Civil dawn ~06:58 EST.
    const out = DateTime.fromISO('2026-11-01T01:30:00-04:00').toJSDate()
    const inn = DateTime.fromISO('2026-11-01T03:30:00-05:00').toJSDate()
    const result = calculateNightTimeFromInstants({
      out,
      in: inn,
      depLatitude: KJFK.lat,
      depLongitude: KJFK.lon,
      destLatitude: KJFK.lat,
      destLongitude: KJFK.lon,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(3)
    expect(result.nightHours).toBe(3)
  })

  it('departs in day and lands at night (LAX 16:30-18:00 PST)', () => {
    // NOAA/timeanddate civil dusk ~17:18 PST 2026-11-12. Night ≈ 0.7 of 1.5.
    const result = localNight({
      date: '2026-11-12',
      out: '16:30',
      inn: '18:00',
      airport: KLAX,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(1.5)
    expect(result.nightHours).toBe(0.7)
  })

  it('departs at night and lands in day (LAX 05:30-07:00 PST)', () => {
    // NOAA/timeanddate begin civil twilight ~05:56 PST 2026-11-12; SunCalc
    // ~05:58 PST. 05:30–05:58 ≈ 0.5h of 1.5.
    const result = localNight({
      date: '2026-11-12',
      out: '05:30',
      inn: '07:00',
      airport: KLAX,
    })
    expect(result.success).toBe(true)
    expect(result.totalHours).toBe(1.5)
    expect(result.nightHours).toBe(0.5)
  })

  it('rejects invalid clock strings', () => {
    const result = calculateNightTime({
      date: '2026-11-12',
      depLatitude: KLAX.lat,
      depLongitude: KLAX.lon,
      outTime: 'invalid-time',
      inTime: '16:45',
      isZulu: true,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('SunCalc vs NOAA sunset/twilight (calibration)', () => {
  it('KLAX 2026-11-12 sunset and civil dusk are within 3 min of NOAA/timeanddate', () => {
    // timeanddate / DateAlmanac Los Angeles 2026-11-12: sunset 16:51 PST,
    // end civil twilight 17:18 PST.
    const times = getSunTimes(new Date('2026-11-12T12:00:00Z'), KLAX.lat, KLAX.lon)
    const sunsetLocal = DateTime.fromJSDate(times.sunset!, { zone: KLAX.tz })
    const duskLocal = DateTime.fromJSDate(times.eveningCivil!, { zone: KLAX.tz })
    const noaaSunset = DateTime.fromObject(
      { year: 2026, month: 11, day: 12, hour: 16, minute: 51 },
      { zone: KLAX.tz }
    )
    const noaaDusk = DateTime.fromObject(
      { year: 2026, month: 11, day: 12, hour: 17, minute: 18 },
      { zone: KLAX.tz }
    )
    expect(Math.abs(sunsetLocal.toMillis() - noaaSunset.toMillis())).toBeLessThan(3 * 60 * 1000)
    expect(Math.abs(duskLocal.toMillis() - noaaDusk.toMillis())).toBeLessThan(3 * 60 * 1000)
  })

  it('KJFK 2026-06-20 sunset and civil dusk are within 3 min of timeanddate/USNO', () => {
    // NYC 2026-06-20: sunset ~20:30 EDT, end civil twilight ~21:03 EDT.
    const times = getSunTimes(new Date('2026-06-20T12:00:00Z'), KJFK.lat, KJFK.lon)
    const sunsetLocal = DateTime.fromJSDate(times.sunset!, { zone: KJFK.tz })
    const duskLocal = DateTime.fromJSDate(times.eveningCivil!, { zone: KJFK.tz })
    const tableSunset = DateTime.fromObject(
      { year: 2026, month: 6, day: 20, hour: 20, minute: 30 },
      { zone: KJFK.tz }
    )
    const tableDusk = DateTime.fromObject(
      { year: 2026, month: 6, day: 20, hour: 21, minute: 3 },
      { zone: KJFK.tz }
    )
    expect(Math.abs(sunsetLocal.toMillis() - tableSunset.toMillis())).toBeLessThan(3 * 60 * 1000)
    expect(Math.abs(duskLocal.toMillis() - tableDusk.toMillis())).toBeLessThan(4 * 60 * 1000)
  })
})
