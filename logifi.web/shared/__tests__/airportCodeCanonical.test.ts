import { describe, expect, it } from 'vitest'
import { canonicalizeAirportCodeForMatch } from '../airportCodeCanonical'

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
