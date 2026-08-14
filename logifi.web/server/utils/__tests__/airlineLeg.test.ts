import { describe, expect, it } from 'vitest'
import { fcvFlightToAirlineLeg, mapAirlineLegToFcvMappedEntry } from '../airlineLeg'
import type { FcvFlight } from '../fcvMap'

describe('fcvFlightToAirlineLeg', () => {
  it('wraps FC View flight into AirlineLeg', () => {
    const flight: FcvFlight = {
      fcv_flight_id: 'fcv-99',
      flight_number: '5770',
      trip_number: 'L7513',
      role: 'CA',
      dep_airport_icao: 'KLGA',
      arr_airport_icao: 'KDCA',
      scheduled_out_local: '2026-08-04 06:05:00',
      scheduled_in_local: '2026-08-04 07:12:00',
      block: '0107',
      fcv_tail_number: 'N12345',
      fcv_aircraft_type: 'E175',
      is_deadhead: 0,
    }
    const leg = fcvFlightToAirlineLeg(flight)
    expect(leg.external_flight_id).toBe('fcv-99')
    expect(leg.import_source).toBe('fc_view')
    expect(leg.flight_number).toBe('5770')
    expect(leg.dep_airport).toBe('KLGA')
    expect(leg.is_deadhead).toBe(false)
  })

  it('does not default missing FC View role to PIC', () => {
    const flight: FcvFlight = {
      fcv_flight_id: 'fcv-99',
      flight_number: '5770',
      dep_airport_icao: 'KLGA',
      arr_airport_icao: 'KDCA',
      scheduled_out_local: '2026-08-04 06:05:00',
    }
    const leg = fcvFlightToAirlineLeg(flight)
    expect(leg.role).toBe('')
  })
})

describe('mapAirlineLegToFcvMappedEntry', () => {
  it('maps Flica leg to FcvMappedEntry preview shape', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260804_5770_LGA',
      import_source: 'flica_aerodatabox',
      flight_number: '5770',
      trip_number: 'L7513',
      role: 'PIC',
      dep_airport: 'LGA',
      arr_airport: 'DCA',
      scheduled_out_local: '2026-08-04 06:05:00',
      scheduled_in_local: '2026-08-04 07:12:00',
      actual_out_local: '2026-08-04 06:08:00',
      actual_in_local: '2026-08-04 07:15:00',
      actual_off_local: '2026-08-04 06:20:00',
      actual_on_local: '2026-08-04 07:05:00',
      fcv_tail_number: 'N12345',
      fcv_aircraft_type: 'E75',
      crew: [
        { position: 'CA', name: 'FARMER, DEREK' },
        { position: 'FO', name: 'SUTTON, DREW' },
      ],
      is_deadhead: false,
      block_minutes: 67,
    })

    expect(entry.fcv_flight_id).toBe('FLICA_20260804_5770_LGA')
    expect(entry.import_source).toBe('flica_aerodatabox')
    expect(entry.departure).toBe('KLGA')
    expect(entry.destination).toBe('KDCA')
    expect(entry.registration).toBe('N12345')
    expect(entry.date).toBe('2026-08-04')
    expect(entry.training_elements).toBe('SUTTON, DREW')
    expect(entry.flight_conditions).toContain('ifr')
    expect(entry.flight_conditions).toContain('crossCountry')
    expect(entry.oooi?.out).toBe('0608')
    expect(entry.oooi?.off).toBe('0620')
  })

  it('maps SIC legs with SIC time and Captain as the other crew', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260804_5772_DCA',
      import_source: 'flica_aerodatabox',
      flight_number: '5772',
      trip_number: 'L7513',
      role: 'SIC',
      dep_airport: 'DCA',
      arr_airport: 'LGA',
      scheduled_out_local: '2026-08-04 08:12:00',
      scheduled_in_local: '2026-08-04 09:53:00',
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: 'N12345',
      fcv_aircraft_type: 'E75',
      crew: [
        { position: 'CA', name: 'FARMER, DEREK' },
        { position: 'FO', name: 'SUTTON, DREW' },
      ],
      is_deadhead: false,
      block_minutes: 60,
    })
    expect(entry.role).toBe('SIC')
    expect((entry.flight_time as Record<string, unknown>).sic).toBe(
      (entry.flight_time as Record<string, unknown>).total
    )
    expect((entry.flight_time as Record<string, unknown>).pic).toBeUndefined()
    expect(entry.training_elements).toBe('FARMER, DEREK')
    expect(entry.training_instructor).toBe('Captain')
    expect(entry.import_metadata?.own_role_unmatched).toBeUndefined()
  })

  it('flags unmatched seat instead of guessing PIC', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260804_5772_DCA',
      import_source: 'flica_aerodatabox',
      flight_number: '5772',
      trip_number: 'L7513',
      role: '',
      dep_airport: 'DCA',
      arr_airport: 'LGA',
      scheduled_out_local: '2026-08-04 08:12:00',
      scheduled_in_local: '2026-08-04 09:53:00',
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: 'E75',
      crew: [
        { position: 'CA', name: 'OTHER, PILOT' },
        { position: 'FO', name: 'SOMEONE, ELSE' },
      ],
      is_deadhead: false,
      block_minutes: 60,
    })
    expect(entry.role).toBe('')
    expect((entry.flight_time as Record<string, unknown>).pic).toBeUndefined()
    expect((entry.flight_time as Record<string, unknown>).sic).toBeUndefined()
    expect((entry.flight_time as Record<string, unknown>).total).toBeTruthy()
    expect(entry.training_instructor).toBeNull()
    expect(entry.import_metadata?.own_role_unmatched).toBe(true)
    expect(entry.import_metadata?.own_role_unmatched_reason).toBe('not_on_crew')
  })

  it('flags no_crew when the pairing has no crew list', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260812_4442_LGA',
      import_source: 'flica_aerodatabox',
      flight_number: '4442',
      trip_number: 'L7G13',
      role: '',
      dep_airport: 'LGA',
      arr_airport: 'RIC',
      scheduled_out_local: '2026-08-12 10:59:00',
      scheduled_in_local: '2026-08-12 12:26:00',
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: '',
      crew: [],
      is_deadhead: false,
      block_minutes: 87,
    })
    expect(entry.role).toBe('')
    expect(entry.import_metadata?.own_role_unmatched_reason).toBe('no_crew')
    expect((entry.flight_time as Record<string, unknown>).pic).toBeUndefined()
    expect((entry.flight_time as Record<string, unknown>).sic).toBeUndefined()
  })

  it('keeps FLICA scheduled Out/In when AeroDataBox only has runway times', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260812_4442_RIC',
      import_source: 'flica_aerodatabox',
      flight_number: '4442',
      trip_number: 'L7G13',
      role: 'PIC',
      dep_airport: 'RIC',
      arr_airport: 'LGA',
      scheduled_out_local: '2026-08-12 13:10:00',
      scheduled_in_local: '2026-08-12 14:26:00',
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: '2026-08-12 13:27:00',
      actual_on_local: '2026-08-12 14:18:00',
      fcv_tail_number: 'N421YX',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 76,
    })
    expect(entry.oooi).toEqual({
      out: '1310',
      off: '1327',
      on: '1418',
      in: '1426',
      isZulu: false,
    })
    expect(entry.departure).toBe('KRIC')
    expect(entry.destination).toBe('KLGA')
  })

  it('tags deadhead legs', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260804_5770_LGA',
      import_source: 'flica_aerodatabox',
      flight_number: '5770',
      trip_number: null,
      role: 'PIC',
      dep_airport: 'LGA',
      arr_airport: 'DCA',
      scheduled_out_local: '2026-08-04 06:05:00',
      scheduled_in_local: '2026-08-04 07:12:00',
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: '',
      crew: [],
      is_deadhead: true,
      block_minutes: 67,
    })
    expect(entry.tags).toEqual(['Deadhead'])
  })
})
