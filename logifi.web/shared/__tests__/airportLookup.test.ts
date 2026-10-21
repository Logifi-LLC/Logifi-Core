import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lookupAirportLocal, lookupAirportLocalAsync } from '../airportLookup'
import { __setAirportClientDbForTests } from '../airportClientDb'
import { loadAirportClientDbFixture, withAirportClientDbFixture } from './airportTestDb'

describe('lookupAirportLocal before catalog load', () => {
  beforeEach(() => {
    __setAirportClientDbForTests(null)
  })

  it('returns null for catalog airports (never wrong guesses)', () => {
    expect(lookupAirportLocal('KLGA')).toBeNull()
  })

  it('still returns coordinate overrides without catalog', () => {
    __setAirportClientDbForTests(null)
    const info = lookupAirportLocal('KLAF')
    expect(info?.name).toContain('Purdue')
  })
})

describe('lookupAirportLocal', () => {
  withAirportClientDbFixture()

  it('finds KLGA by ICAO', () => {
    const info = lookupAirportLocal('KLGA')
    expect(info?.icao).toBe('KLGA')
    expect(info?.iata).toBe('LGA')
  })

  it('finds LGA by IATA', () => {
    const info = lookupAirportLocal('LGA')
    expect(info?.icao).toBe('KLGA')
  })

  it('does not resolve KAWA as Awassa (AWA/HALA)', () => {
    expect(lookupAirportLocal('KAWA')).toBeNull()
  })

  it('does not resolve KTIP as Tripoli via IATA TIP', () => {
    const info = lookupAirportLocal('KTIP')
    expect(info).toBeNull()
  })

  it('still resolves HALA and HLLT by real ICAO', () => {
    expect(lookupAirportLocal('HALA')?.name).toContain('Awassa')
    expect(lookupAirportLocal('HLLT')?.name).toContain('Tripoli')
  })

  it('lookupAirportLocalAsync resolves after fetch', async () => {
    __setAirportClientDbForTests(null)
    const db = loadAirportClientDbFixture()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => db,
      })
    )
    const info = await lookupAirportLocalAsync('KJFK')
    expect(info?.icao).toBe('KJFK')
    vi.unstubAllGlobals()
  })
})
