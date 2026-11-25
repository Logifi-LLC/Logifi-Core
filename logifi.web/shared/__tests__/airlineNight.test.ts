import { describe, expect, it } from 'vitest'
import { computeAirlineNight } from '../airlineNight'

const KLAX = { latitude: 33.9425, longitude: -118.4081 }
const KJFK = { latitude: 40.6398, longitude: -73.7789 }
const KLAS = { latitude: 36.0801, longitude: -115.1522 }

const lookups = {
  lookupCoords: (code: string) => {
    const map: Record<string, { latitude: number; longitude: number }> = {
      KLAX,
      LAX: KLAX,
      KJFK,
      JFK: KJFK,
      KLAS,
      LAS: KLAS,
    }
    return map[code.trim().toUpperCase()] ?? null
  },
  lookupTz: (code: string) => {
    const map: Record<string, string> = {
      KLAX: 'America/Los_Angeles',
      LAX: 'America/Los_Angeles',
      KJFK: 'America/New_York',
      JFK: 'America/New_York',
      KLAS: 'America/Los_Angeles',
      LAS: 'America/Los_Angeles',
    }
    return map[code.trim().toUpperCase()] ?? null
  },
}

describe('computeAirlineNight', () => {
  it('parses Autofi airport-local OOOI (isZulu false) for the LAX afternoon repro', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KLAX',
        arrCode: 'KLAX',
        date: '2026-11-12',
        outLocalDatetime: '2026-11-12 16:00:00',
        inLocalDatetime: '2026-11-12 16:45:00',
        onLocalDatetime: '2026-11-12 16:40:00',
        oooi: { out: '1600', in: '1645', on: '1640', isZulu: false },
      },
      lookups
    )
    expect(result.totalHours).toBe(0.8)
    expect(result.nightHours).toBe(0)
    expect(result.isNightLanding).toBe(false)
  })

  it('marks a full-stop night landing on a late LAX arrival, separate from night TIME', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KLAS',
        arrCode: 'KLAX',
        date: '2026-11-12',
        outLocalDatetime: '2026-11-12 16:30:00',
        inLocalDatetime: '2026-11-12 18:15:00',
        onLocalDatetime: '2026-11-12 18:05:00',
        oooi: { out: '1630', in: '1815', on: '1805', isZulu: false },
      },
      lookups
    )
    expect(result.isNightLanding).toBe(true)
    expect(result.nightHours).toBeGreaterThan(0)
  })

  it('still uses airport-local source datetimes when stored oooi is Zulu', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KLAX',
        arrCode: 'KLAX',
        date: '2026-11-12',
        outLocalDatetime: '2026-11-12 16:00:00',
        inLocalDatetime: '2026-11-12 16:45:00',
        onLocalDatetime: '2026-11-12 16:40:00',
        oooi: { out: '0000', in: '0045', on: '0040', isZulu: true },
      },
      lookups
    )
    expect(result.totalHours).toBe(0.8)
    expect(result.nightHours).toBe(0)
    expect(result.isNightLanding).toBe(false)
  })

  it('uses Out→In for night hours (block), matching total-time semantics', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KLAX',
        arrCode: 'KLAS',
        date: '2026-11-12',
        outLocalDatetime: '2026-11-12 12:00:00',
        inLocalDatetime: '2026-11-12 13:12:00',
        onLocalDatetime: '2026-11-12 13:00:00',
        oooi: { out: '1200', in: '1312', on: '1300', isZulu: false },
      },
      lookups
    )
    expect(result.totalHours).toBe(1.2)
    expect(result.nightHours).toBe(0)
    expect(result.isNightLanding).toBe(false)
  })
})

describe('computeAirlineNight takeoffs (61.57(b) window at the departure airport)', () => {
  const KSEA = { latitude: 47.4502, longitude: -122.3088 }
  const KPDX = { latitude: 45.5887, longitude: -122.5975 }
  const pnw = {
    lookupCoords: (code: string) => ({ KSEA, KPDX } as Record<string, typeof KSEA>)[code] ?? null,
    lookupTz: (code: string) => (code === 'KSEA' || code === 'KPDX' ? 'America/Los_Angeles' : null),
  }

  it('classifies a night takeoff separately from a day landing', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KSEA',
        arrCode: 'KPDX',
        outLocalDatetime: '2026-11-03 05:05:00',
        offLocalDatetime: '2026-11-03 05:20:00',
        onLocalDatetime: '2026-11-03 06:20:00',
        inLocalDatetime: '2026-11-03 06:30:00',
      },
      pnw
    )
    expect(result.isNightTakeoff).toBe(true)
    expect(result.isNightLanding).toBe(false)
  })

  it('classifies a day takeoff separately from a night landing', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KSEA',
        arrCode: 'KPDX',
        outLocalDatetime: '2026-11-03 16:50:00',
        offLocalDatetime: '2026-11-03 17:00:00',
        onLocalDatetime: '2026-11-03 18:10:00',
        inLocalDatetime: '2026-11-03 18:20:00',
      },
      pnw
    )
    expect(result.isNightTakeoff).toBe(false)
    expect(result.isNightLanding).toBe(true)
  })

  it('uses wheels-off, not block-out, when both are known', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KSEA',
        arrCode: 'KPDX',
        outLocalDatetime: '2026-11-03 17:40:00',
        offLocalDatetime: '2026-11-03 18:05:00',
        inLocalDatetime: '2026-11-03 19:00:00',
      },
      pnw
    )
    expect(result.isNightTakeoff).toBe(true)
  })

  it('falls back to block-out when no wheels-off time exists', () => {
    const result = computeAirlineNight(
      {
        depCode: 'KSEA',
        arrCode: 'KPDX',
        outLocalDatetime: '2026-11-03 05:10:00',
        inLocalDatetime: '2026-11-03 06:30:00',
      },
      pnw
    )
    expect(result.isNightTakeoff).toBe(true)
  })

  it('leaves takeoffs unclassified when the departure airport is unresolved', () => {
    const noZone = computeAirlineNight(
      {
        depCode: 'KSEA',
        arrCode: 'KPDX',
        offLocalDatetime: '2026-11-03 05:20:00',
        outLocalDatetime: '2026-11-03 05:05:00',
        inLocalDatetime: '2026-11-03 06:30:00',
      },
      { ...pnw, lookupTz: (code: string) => (code === 'KPDX' ? 'America/Los_Angeles' : null) }
    )
    expect(noZone.isNightTakeoff).toBeNull()

    const noCoords = computeAirlineNight(
      { depCode: 'ZZZZ', arrCode: 'KPDX', offLocalDatetime: '2026-11-03 05:20:00' },
      pnw
    )
    expect(noCoords.isNightTakeoff).toBeNull()
  })
})

