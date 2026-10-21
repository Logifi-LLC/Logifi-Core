import { describe, expect, it } from 'vitest'
import { getAirportIanaTimezone, normalizeTimezoneToIANA } from '../airportTimezone'
import { withAirportClientDbFixture } from './airportTestDb'

describe('normalizeTimezoneToIANA', () => {
  it('passes through IANA zones', () => {
    expect(normalizeTimezoneToIANA('America/Chicago')).toBe('America/Chicago')
  })

  it('maps numeric offsets', () => {
    expect(normalizeTimezoneToIANA('-5')).toBe('America/New_York')
    expect(normalizeTimezoneToIANA('UTC-6')).toBe('America/Chicago')
  })
})

describe('getAirportIanaTimezone', () => {
  withAirportClientDbFixture()

  it('resolves US airports by ICAO', () => {
    expect(getAirportIanaTimezone('KDCA')).toBe('America/New_York')
    expect(getAirportIanaTimezone('KBNA')).toBe('America/Chicago')
  })

  it('resolves by IATA', () => {
    expect(getAirportIanaTimezone('DCA')).toBe('America/New_York')
    expect(getAirportIanaTimezone('BNA')).toBe('America/Chicago')
  })

  it('returns null for unknown codes', () => {
    expect(getAirportIanaTimezone('ZZZZ')).toBeNull()
    expect(getAirportIanaTimezone('')).toBeNull()
  })

  it('does not resolve KAWA via bogus IATA', () => {
    expect(getAirportIanaTimezone('KAWA')).toBeNull()
  })
})
