import { describe, it, expect } from 'vitest'
import { lookupSupplementAirport } from '../airportSupplement'

describe('airportSupplement', () => {
  it('finds KBEH by ICAO', () => {
    const entry = lookupSupplementAirport('KBEH')
    expect(entry?.name).toBe('Southwest Michigan Regional Airport')
    expect(entry?.city).toBe('Benton Harbor')
  })

  it('finds KBEH by FAA identifier BEH', () => {
    const entry = lookupSupplementAirport('BEH')
    expect(entry?.icao).toBe('KBEH')
  })

  it('finds KFRR for round-trip route stops', () => {
    const entry = lookupSupplementAirport('KFRR')
    expect(entry?.name).toContain('Front Royal')
  })
})
