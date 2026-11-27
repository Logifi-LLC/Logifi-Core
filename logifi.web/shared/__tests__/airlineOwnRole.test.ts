import { describe, expect, it } from 'vitest'
import {
  applySeatToFlightTime,
  formatListedCrewHint,
  parseAirlineOwnSeat,
  pickOppositeCrew,
} from '../airlineOwnRole'

describe('parseAirlineOwnSeat', () => {
  it('maps CA/Captain/PIC to PIC', () => {
    expect(parseAirlineOwnSeat('CA')).toBe('PIC')
    expect(parseAirlineOwnSeat('Captain')).toBe('PIC')
    expect(parseAirlineOwnSeat('PIC')).toBe('PIC')
  })

  it('maps FO/First Officer/SIC to SIC', () => {
    expect(parseAirlineOwnSeat('FO')).toBe('SIC')
    expect(parseAirlineOwnSeat('First Officer')).toBe('SIC')
    expect(parseAirlineOwnSeat('SIC')).toBe('SIC')
    expect(parseAirlineOwnSeat('second in command')).toBe('SIC')
  })

  it('does not guess PIC for empty or unknown values', () => {
    expect(parseAirlineOwnSeat('')).toBeNull()
    expect(parseAirlineOwnSeat(null)).toBeNull()
    expect(parseAirlineOwnSeat('FA')).toBeNull()
    expect(parseAirlineOwnSeat('unknown')).toBeNull()
  })
})

describe('applySeatToFlightTime', () => {
  it('moves total into SIC and clears PIC', () => {
    expect(applySeatToFlightTime({ total: 1.5, pic: 1.5 }, 'SIC')).toEqual({
      total: 1.5,
      sic: 1.5,
    })
  })
})

describe('pickOppositeCrew', () => {
  it('picks FO when own seat is PIC', () => {
    const other = pickOppositeCrew(
      [
        { position: 'CA', name: 'EXAMPLE, JANE' },
        { position: 'FO', name: 'SAMPLE, JOHN' },
      ],
      'PIC'
    )
    expect(other).toEqual({ name: 'SAMPLE, JOHN', label: 'First Officer' })
  })

  it('returns null when the opposite seat is missing', () => {
    expect(pickOppositeCrew([{ position: 'CA', name: 'EXAMPLE, JANE' }], 'PIC')).toBeNull()
  })

  it('does not treat the user as the other pilot when the opposite row shares their employee id', () => {
    expect(
      pickOppositeCrew(
        [
          { position: 'CA', name: 'EXAMPLE, JANE', employeeId: '900001' },
          { position: 'FO', name: 'EXAMPLE, JANE', employeeId: '900001' },
        ],
        'PIC'
      )
    ).toBeNull()
  })
})

describe('formatListedCrewHint', () => {
  it('describes a crew line that did not include the user', () => {
    expect(
      formatListedCrewHint(
        [
          { position: 'CA', name: 'EXAMPLE, JANE' },
          { position: 'FO', name: 'SAMPLE, JOHN' },
        ],
        'not_on_crew'
      )
    ).toBe('Crew listed: CA EXAMPLE, JANE · FO SAMPLE, JOHN — you were not found.')
  })
})
