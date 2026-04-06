import { describe, expect, it } from 'vitest'
import {
  mapFcvFlightToEntry,
  parseFcvLocalDatetimeToHHMM,
  parseFcvBlockToHours,
} from '../fcvMap'

describe('parseFcvLocalDatetimeToHHMM', () => {
  it('parses space-separated local datetime', () => {
    expect(parseFcvLocalDatetimeToHHMM('2026-04-01 07:30:00')).toBe('0730')
  })

  it('parses T-separated ISO-like local datetime', () => {
    expect(parseFcvLocalDatetimeToHHMM('2026-04-01T14:05:00')).toBe('1405')
  })

  it('pads single-digit hour', () => {
    expect(parseFcvLocalDatetimeToHHMM('2026-04-01 9:05:00')).toBe('0905')
  })

  it('returns null for invalid input', () => {
    expect(parseFcvLocalDatetimeToHHMM('')).toBeNull()
    expect(parseFcvLocalDatetimeToHHMM(null)).toBeNull()
    expect(parseFcvLocalDatetimeToHHMM('not-a-date')).toBeNull()
  })
})

describe('mapFcvFlightToEntry', () => {
  it('maps OOOI from actual with scheduled fallback for out/in', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: '1',
      actual_out_local: '2026-04-01 08:00:00',
      actual_off_local: '2026-04-01 08:12:00',
      actual_on_local: '2026-04-01 10:30:00',
      actual_in_local: '2026-04-01 10:45:00',
      scheduled_out_local: '2026-04-01 07:00:00',
      scheduled_in_local: '2026-04-01 09:00:00',
      dep_airport_icao: 'KSEA',
      arr_airport_icao: 'KPDX',
      block: '0135',
      fcv_tail_number: 'N123',
      fcv_aircraft_type: 'B737',
    })
    expect(e.oooi).toEqual({
      out: '0800',
      off: '0812',
      on: '1030',
      in: '1045',
      isZulu: false,
    })
    const total = 1 + 35 / 60
    expect(e.flight_time).toMatchObject({
      total,
      pic: total,
      crossCountry: total,
    })
    expect(e.flight_conditions).toEqual(['ifr', 'crossCountry'])
  })

  it('maps PIC flights with other crew as First Officer', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: 'pic-role',
      role: 'PIC',
      scheduled_out_local: '2026-04-01 07:00:00',
      dep_airport_icao: 'KSEA',
      arr_airport_icao: 'KPDX',
      block: '0100',
      crew: [
        { name: 'Me Pilot', role: 'PIC', is_me: true },
        { name: 'Jane Doe', role: 'SIC' },
      ],
    })
    expect(e.role).toBe('PIC')
    expect(e.flight_time).toMatchObject({ total: 1, pic: 1, crossCountry: 1 })
    expect((e.flight_time as Record<string, unknown>).sic).toBeUndefined()
    expect(e.training_elements).toBe('Jane Doe')
    expect(e.training_instructor).toBe('First Officer')
  })

  it('maps SIC flights with other crew as Captain and SIC time', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: 'sic-role',
      role: 'SIC',
      scheduled_out_local: '2026-04-01 07:00:00',
      dep_airport_icao: 'KSEA',
      arr_airport_icao: 'KPDX',
      block: '0100',
      crew_members: [
        { name: 'Me Pilot', role: 'SIC', is_me: true },
        { name: 'John Smith', role: 'PIC' },
      ],
    })
    expect(e.role).toBe('SIC')
    expect(e.flight_time).toMatchObject({ total: 1, sic: 1, crossCountry: 1 })
    expect((e.flight_time as Record<string, unknown>).pic).toBeUndefined()
    expect(e.training_elements).toBe('John Smith')
    expect(e.training_instructor).toBe('Captain')
  })

  it('maps FCV crew_list with CA/FO position codes', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: 'crew-list-ca-fo',
      role: 'PIC',
      scheduled_out_local: '2026-04-01 16:04:00',
      dep_airport_icao: 'KBUF',
      arr_airport_icao: 'KLGA',
      block: '0121',
      crew_list: [
        { position: 'CA', name: 'FARMER, DEREK', id: '624619' },
        { position: 'FO', name: 'MATHENY, PRESTON', id: '624601' },
      ],
    })
    expect(e.role).toBe('PIC')
    expect(e.flight_time).toMatchObject({
      total: 1 + 21 / 60,
      pic: 1 + 21 / 60,
      crossCountry: 1 + 21 / 60,
    })
    expect(e.training_elements).toBe('MATHENY, PRESTON')
    expect(e.training_instructor).toBe('First Officer')
  })

  it('falls back to scheduled out/in when actual missing', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: '2',
      scheduled_out_local: '2026-05-10 06:15:00',
      scheduled_in_local: '2026-05-10 09:20:00',
      dep_airport: 'SEA',
      arr_airport: 'PDX',
    })
    expect(e.oooi).toEqual({
      out: '0615',
      off: null,
      on: null,
      in: '0920',
      isZulu: false,
    })
  })

  it('sets oooi null when no times', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: '3',
      scheduled_out_local: 'invalid',
      dep_airport: 'SEA',
      arr_airport: 'PDX',
    })
    expect(e.oooi).toBeNull()
  })

  it('sets IFR only when no XC leg (same airport)', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: '5',
      scheduled_out_local: '2026-06-01 12:00:00',
      dep_airport_icao: 'KORD',
      arr_airport_icao: 'KORD',
      block: '0100',
      fcv_tail_number: 'N1',
    })
    const total = 1
    expect(e.flight_time).toEqual({ total, pic: total })
    expect(e.flight_conditions).toEqual(['ifr'])
  })

  it('does not throw or set crew fields for malformed crew payload', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: 'bad-crew',
      role: 'SIC',
      scheduled_out_local: '2026-04-01 07:00:00',
      dep_airport_icao: 'KSEA',
      arr_airport_icao: 'KPDX',
      block: '0100',
      crew: { not: 'an-array' },
    })
    expect(e.role).toBe('SIC')
    expect(e.flight_time).toMatchObject({ total: 1, sic: 1, crossCountry: 1 })
    expect(e.training_elements).toBeNull()
    expect(e.training_instructor).toBeNull()
  })

  it('stores fcv_raw and remarks/trip/deadhead tag', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: '4',
      scheduled_out_local: '2026-06-01 12:00:00',
      tail_info: 'Ship 42',
      trip_number: 'T-99',
      is_deadhead: 1,
      extra_field: 'kept',
      dep_airport: 'SEA',
      arr_airport: 'PDX',
    })
    expect(e.remarks).toBe('Ship 42\nTrip: T-99')
    expect(e.tags).toEqual(['Deadhead'])
    expect(e.flight_conditions).toEqual(['ifr'])
    expect(e.import_metadata?.fcv_raw).toMatchObject({
      fcv_flight_id: '4',
      extra_field: 'kept',
      is_deadhead: 1,
    })
  })

  it('parseFcvBlockToHours unchanged', () => {
    expect(parseFcvBlockToHours('0135')).toBeCloseTo(1 + 35 / 60)
  })

  it('normalizes E75S to canonical ERJ-175 model', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: 'e75s',
      scheduled_out_local: '2026-06-01 12:00:00',
      dep_airport_icao: 'KORD',
      arr_airport_icao: 'KBOS',
      fcv_aircraft_type: 'E75S',
    })
    expect(e.aircraft_make_model).toBe('ERJ-175')
  })

  it('maps broad AIRPLANE category to AMEL class', () => {
    const e = mapFcvFlightToEntry({
      fcv_flight_id: 'airplane-class',
      scheduled_out_local: '2026-06-01 12:00:00',
      dep_airport_icao: 'KORD',
      arr_airport_icao: 'KBOS',
      aircraft_category: 'AIRPLANE',
    })
    expect(e.aircraft_category_class).toBe('AMEL')
  })
})
