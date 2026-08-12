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
    expect(entry.registration).toBe('N12345')
    expect(entry.date).toBe('2026-08-04')
    expect(entry.training_elements).toBe('SUTTON, DREW')
    expect(entry.flight_conditions).toContain('ifr')
    expect(entry.flight_conditions).toContain('crossCountry')
    expect(entry.oooi?.out).toBe('0608')
    expect(entry.oooi?.off).toBe('0620')
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
