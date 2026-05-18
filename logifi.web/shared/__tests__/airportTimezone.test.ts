import { describe, expect, it } from 'vitest'
import { getAirportIanaTimezone, normalizeTimezoneToIANA } from '../airportTimezone'

describe('normalizeTimezoneToIANA', () => {
  it('maps numeric US offsets to IANA', () => {
    expect(normalizeTimezoneToIANA('-5')).toBe('America/New_York')
    expect(normalizeTimezoneToIANA('-6')).toBe('America/Chicago')
    expect(normalizeTimezoneToIANA('-8')).toBe('America/Los_Angeles')
  })

  it('passes through IANA strings', () => {
    expect(normalizeTimezoneToIANA('America/Chicago')).toBe('America/Chicago')
  })

  it('returns null for empty input', () => {
    expect(normalizeTimezoneToIANA(null)).toBeNull()
    expect(normalizeTimezoneToIANA('')).toBeNull()
  })
})

describe('getAirportIanaTimezone', () => {
  it('resolves KDCA and KBNA to Eastern and Central', () => {
    expect(getAirportIanaTimezone('KDCA')).toBe('America/New_York')
    expect(getAirportIanaTimezone('KBNA')).toBe('America/Chicago')
  })

  it('resolves IATA codes', () => {
    expect(getAirportIanaTimezone('DCA')).toBe('America/New_York')
    expect(getAirportIanaTimezone('BNA')).toBe('America/Chicago')
  })

  it('returns null for unknown codes', () => {
    expect(getAirportIanaTimezone('ZZZZ')).toBeNull()
    expect(getAirportIanaTimezone('')).toBeNull()
  })
})
