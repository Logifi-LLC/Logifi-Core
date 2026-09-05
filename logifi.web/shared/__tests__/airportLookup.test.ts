import { describe, expect, it } from 'vitest'
import { lookupAirportLocal } from '../airportLookup'

describe('lookupAirportLocal', () => {
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
})
