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

  it('does not rewrite unknown Kxxx to foreign IATA ICAOs', () => {
    // KAWA is not a US ICAO; AWA is Awassa (HALA). Must not collapse.
    expect(canonicalizeAirportCodeForMatch('KAWA')).toBe('KAWA')
    expect(canonicalizeAirportCodeForMatch('KAWA')).not.toBe('HALA')
    // KTIP is Rantoul (US); TIP is Tripoli (HLLT). Must not collapse.
    expect(canonicalizeAirportCodeForMatch('KTIP')).toBe('KTIP')
    expect(canonicalizeAirportCodeForMatch('KTIP')).not.toBe('HLLT')
  })

  it('still maps real 3-letter IATA AWA/TIP to their ICAOs', () => {
    expect(canonicalizeAirportCodeForMatch('AWA')).toBe('HALA')
    expect(canonicalizeAirportCodeForMatch('TIP')).toBe('HLLT')
  })
})

describe('toCatalogAirportCode', () => {
  it('maps IATA RIC and LGA to catalog ICAO', () => {
    expect(toCatalogAirportCode('RIC')).toBe('KRIC')
    expect(toCatalogAirportCode('LGA')).toBe('KLGA')
    expect(toCatalogAirportCode('ric')).toBe('KRIC')
  })
})
