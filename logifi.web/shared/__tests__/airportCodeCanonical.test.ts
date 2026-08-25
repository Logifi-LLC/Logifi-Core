import { describe, expect, it } from 'vitest'
import { canonicalizeAirportCodeForMatch, toCatalogAirportCode } from '../airportCodeCanonical'

describe('canonicalizeAirportCodeForMatch', () => {
  it('maps IATA BUF to ICAO KBUF when present in dataset', () => {
    expect(canonicalizeAirportCodeForMatch('BUF')).toBe('KBUF')
  })

  it('keeps KLGA as ICAO', () => {
    expect(canonicalizeAirportCodeForMatch('KLGA')).toBe('KLGA')
  })

  it('returns uppercase unknown codes unchanged', () => {
    expect(canonicalizeAirportCodeForMatch('ZZ1')).toBe('ZZ1')
  })
})

describe('toCatalogAirportCode', () => {
  it('maps IATA RIC and LGA to catalog ICAO', () => {
    expect(toCatalogAirportCode('RIC')).toBe('KRIC')
    expect(toCatalogAirportCode('LGA')).toBe('KLGA')
    expect(toCatalogAirportCode('ric')).toBe('KRIC')
  })
})
