import { describe, expect, it } from 'vitest'
import {
  localDatetimeToZuluHhmm,
  oooiEventsToUtcInstants,
  oooiPairDurationHours,
  oooiSequenceIsInOrder,
  utcDatetimeToZuluHhmm,
} from '../oooiClock'
import { withAirportClientDbFixture } from './airportTestDb'
import { getAirportIanaTimezone } from '../airportTimezone'

describe('oooiClock', () => {
  withAirportClientDbFixture()

  it('converts airport-local datetime to Zulu HHMM', () => {
    expect(localDatetimeToZuluHhmm('2026-11-13 12:00:00', 'America/New_York')).toBe('1700')
    expect(localDatetimeToZuluHhmm('2026-11-13 11:40:00', 'America/Chicago')).toBe('1740')
  })

  it('parses UTC ISO to Zulu HHMM', () => {
    expect(utcDatetimeToZuluHhmm('2026-11-13T17:00:00Z')).toBe('1700')
  })

  it('same-zone local Out→In duration matches naive clock math', () => {
    expect(
      oooiPairDurationHours({
        start: '1000',
        end: '1130',
        date: '2026-11-13',
        isZulu: false,
        startTimezone: 'America/New_York',
        endTimezone: 'America/New_York',
      })
    ).toBe(1.5)
  })

  it('IND→ORD local clocks duration is 1.0h not a midnight wrap', () => {
    expect(
      oooiPairDurationHours({
        start: '1200',
        end: '1200',
        date: '2026-11-13',
        isZulu: false,
        startTimezone: 'America/New_York',
        endTimezone: 'America/Chicago',
      })
    ).toBe(1.0)
  })

  it('Zulu duration is unchanged for same-zone converted clocks', () => {
    expect(
      oooiPairDurationHours({
        start: '1500',
        end: '1630',
        date: '2026-11-13',
        isZulu: true,
      })
    ).toBe(1.5)
  })

  it('zones mixed local OOOI so On is after Off on IND→ORD', () => {
    const events = oooiEventsToUtcInstants({
      date: '2026-11-13',
      departure: 'KIND',
      destination: 'KORD',
      lookupTz: getAirportIanaTimezone,
      oooi: {
        out: '1200',
        off: '1210',
        on: '1140',
        in: '1200',
        isZulu: false,
      },
    })
    expect(events).not.toBeNull()
    expect(oooiSequenceIsInOrder(events!)).toBe(true)
  })
})
