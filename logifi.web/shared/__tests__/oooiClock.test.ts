import { describe, expect, it } from 'vitest'
import {
  convertOooiFieldsToClock,
  convertOooiHhmmBetweenClocks,
  formatOooiClockInputOnBlur,
  formatOooiOppositeClockTooltip,
  normalizeOooiClockOnBlur,
  sanitizeOooiClockDigitsWhileTyping,
  localDatetimeToZuluHhmm,
  oooiClockToUtc,
  oooiEventsToUtcInstants,
  oooiPairDurationHours,
  oooiSequenceIsInOrder,
  toggleOooiClockView,
  utcDatetimeToZuluHhmm,
} from '../oooiClock'
import { withAirportClientDbFixture } from './airportTestDb'
import { getAirportIanaTimezone } from '../airportTimezone'

const TEST_ZONES: Record<string, string> = {
  KJFK: 'America/New_York',
  KIND: 'America/New_York',
  KORD: 'America/Chicago',
}

function lookupTestTz(code: string): string | null {
  return TEST_ZONES[code] ?? null
}

function eventMillis(
  dateYmd: string,
  hhmm: string,
  isZulu: boolean,
  zone: string | null
): number | null {
  return oooiClockToUtc(dateYmd, hhmm, isZulu, zone)?.toMillis() ?? null
}

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

  it('converts stored Zulu HHMM to airport-local', () => {
    expect(
      convertOooiHhmmBetweenClocks({
        dateYmd: '2026-11-13',
        hhmm: '1432',
        fromZulu: true,
        toZulu: false,
        zone: 'America/New_York',
      })
    ).toBe('0932')
  })

  it('converts stored local HHMM to Zulu', () => {
    expect(
      convertOooiHhmmBetweenClocks({
        dateYmd: '2026-11-13',
        hhmm: '0932',
        fromZulu: false,
        toZulu: true,
        zone: 'America/New_York',
      })
    ).toBe('1432')
  })

  it('tooltip for stored Zulu shows local at the event airport', () => {
    expect(
      formatOooiOppositeClockTooltip({
        dateYmd: '2026-11-13',
        hhmm: '1432',
        isZulu: true,
        event: 'out',
        departure: 'KJFK',
        destination: 'KORD',
        lookupTz: lookupTestTz,
      })
    ).toBe('0932 local (KJFK)')
  })

  it('tooltip for stored local shows Zulu', () => {
    expect(
      formatOooiOppositeClockTooltip({
        dateYmd: '2026-11-13',
        hhmm: '0932',
        isZulu: false,
        event: 'out',
        departure: 'KJFK',
        destination: 'KORD',
        lookupTz: lookupTestTz,
      })
    ).toBe('1432Z')
  })

  it('tooltip for On/In uses arrival airport, not departure', () => {
    expect(
      formatOooiOppositeClockTooltip({
        dateYmd: '2026-11-13',
        hhmm: '1800',
        isZulu: true,
        event: 'in',
        departure: 'KIND',
        destination: 'KORD',
        lookupTz: lookupTestTz,
      })
    ).toBe('1200 local (KORD)')
  })

  it('shows no tooltip when the airport TZ is unknown', () => {
    expect(
      formatOooiOppositeClockTooltip({
        dateYmd: '2026-11-13',
        hhmm: '1432',
        isZulu: true,
        event: 'out',
        departure: 'ZZZZ',
        destination: 'YYYY',
        lookupTz: lookupTestTz,
      })
    ).toBeNull()
  })

  it('converts a cross-zone IND→ORD Zulu leg to mixed local clocks', () => {
    const local = convertOooiFieldsToClock({
      dateYmd: '2026-11-13',
      departure: 'KIND',
      destination: 'KORD',
      lookupTz: lookupTestTz,
      toZulu: false,
      oooi: {
        out: '1700',
        off: '1710',
        on: '1740',
        in: '1800',
        isZulu: true,
      },
    })
    expect(local).toEqual({
      out: '1200',
      off: '1210',
      on: '1140',
      in: '1200',
      isZulu: false,
    })
  })

  it('does not convert when a present clock has an unknown TZ', () => {
    expect(
      convertOooiFieldsToClock({
        dateYmd: '2026-11-13',
        departure: 'ZZZZ',
        destination: 'KORD',
        lookupTz: lookupTestTz,
        toZulu: false,
        oooi: { out: '1700', in: '1800', isZulu: true },
      })
    ).toBeNull()
  })

  it('toggle round-trip keeps HHMM, isZulu, and the stored instant', () => {
    const stored = {
      out: '1700',
      off: '1710',
      on: '1740',
      in: '1800',
      isZulu: true,
    }
    const local = toggleOooiClockView({
      dateYmd: '2026-11-13',
      oooi: stored,
      departure: 'KIND',
      destination: 'KORD',
      lookupTz: lookupTestTz,
    })
    const back = toggleOooiClockView({
      dateYmd: '2026-11-13',
      oooi: local,
      departure: 'KIND',
      destination: 'KORD',
      lookupTz: lookupTestTz,
    })
    expect(back).toEqual(stored)

    const depZone = 'America/New_York'
    const arrZone = 'America/Chicago'
    for (const key of ['out', 'off'] as const) {
      expect(eventMillis('2026-11-13', stored[key], true, 'UTC')).toBe(
        eventMillis('2026-11-13', local[key] as string, false, depZone)
      )
    }
    for (const key of ['on', 'in'] as const) {
      expect(eventMillis('2026-11-13', stored[key], true, 'UTC')).toBe(
        eventMillis('2026-11-13', local[key] as string, false, arrZone)
      )
    }
  })

  it('unknown-TZ toggle flips isZulu without rewriting HHMM', () => {
    const stored = { out: '1432', in: '1600', isZulu: true }
    const next = toggleOooiClockView({
      dateYmd: '2026-11-13',
      oooi: stored,
      departure: 'ZZZZ',
      destination: 'YYYY',
      lookupTz: lookupTestTz,
    })
    expect(next).toEqual({ out: '1432', in: '1600', isZulu: false })
  })

  it('sanitizes clock input while typing to digits only', () => {
    expect(sanitizeOooiClockDigitsWhileTyping('22:48x')).toBe('2248')
    expect(sanitizeOooiClockDigitsWhileTyping('2248123')).toBe('2248')
  })

  it('formats a new manual entry on blur (3-digit HMM)', () => {
    const firstEntry = normalizeOooiClockOnBlur('945', true)
    expect(firstEntry).toEqual({ kind: 'formatted', value: '09:45' })
  })

  it('leaves stored clocks unchanged on blur when the user did not edit', () => {
    expect(normalizeOooiClockOnBlur('2248', false)).toEqual({ kind: 'skip' })
    expect(normalizeOooiClockOnBlur('22:48', false)).toEqual({ kind: 'skip' })
  })

  it('formats a correction on blur after the user edits', () => {
    const fixed = normalizeOooiClockOnBlur('2248', true)
    expect(fixed).toEqual({ kind: 'formatted', value: '22:48' })
    const already = normalizeOooiClockOnBlur('22:48', true)
    expect(already).toEqual({ kind: 'unchanged' })
  })

  it('formats ON/IN to HH:MM on blur when Zulu sequence is out of order', () => {
  /** Fictional Zulu leg — not from a real logbook. IN precedes ON. */
    const date = '2026-03-15'
    const oooi = {
      out: '21:10',
      off: '21:21',
      on: '2248',
      in: '2239',
      isZulu: true,
    }

    const onFormatted = formatOooiClockInputOnBlur(oooi.on)
    const inFormatted = formatOooiClockInputOnBlur(oooi.in)
    expect(onFormatted).toBe('22:48')
    expect(inFormatted).toBe('22:39')

    const events = oooiEventsToUtcInstants({
      date,
      departure: 'KZZZ',
      destination: 'KZZY',
      oooi: {
        out: oooi.out,
        off: oooi.off,
        on: onFormatted,
        in: inFormatted,
        isZulu: true,
      },
    })
    expect(events).not.toBeNull()
    expect(oooiSequenceIsInOrder(events!)).toBe(false)
  })
})
