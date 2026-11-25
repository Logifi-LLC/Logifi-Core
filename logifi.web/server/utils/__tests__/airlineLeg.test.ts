import { describe, expect, it } from 'vitest'
import { fcvFlightToAirlineLeg, mapAirlineLegToFcvMappedEntry } from '../airlineLeg'
import { isDeadheadMappedFlight } from '../../../shared/airlineOwnRole'
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
    expect(entry.oooi?.out).toBe('10:08')
    expect(entry.oooi?.in).toBe('11:15')
    expect(entry.oooi?.off).toBe('10:20')
    expect(entry.oooi?.isZulu).toBe(true)
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

  it('leaves the other pilot blank when a reserve FO seat was not listed', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260804_5772_DCA',
      import_source: 'flica_aerodatabox',
      flight_number: '5772',
      trip_number: 'L7513',
      role: 'PIC',
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
      crew: [{ position: 'CA', name: 'FARMER, DEREK', employeeId: '624619' }],
      is_deadhead: false,
      block_minutes: 60,
    })
    expect(entry.role).toBe('PIC')
    expect(entry.training_elements).toBeNull()
    expect(entry.training_instructor).toBeNull()
    const normalized = entry.import_metadata?.normalized as { crew_name_raw?: string | null }
    expect(normalized.crew_name_raw).toBeNull()
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

  it('prefers enrich actual Out/In over FLICA scheduled when both are present', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260819_4349_LGA',
      import_source: 'flica_aerodatabox',
      flight_number: '4349',
      trip_number: 'L7H18',
      role: 'PIC',
      dep_airport: 'LGA',
      arr_airport: 'ATL',
      scheduled_out_local: '2026-08-19 11:44:00',
      scheduled_in_local: '2026-08-19 13:52:00',
      actual_out_local: '2026-08-19 11:50:00',
      actual_in_local: '2026-08-19 14:30:00',
      actual_off_local: '2026-08-19 11:59:00',
      actual_on_local: '2026-08-19 13:46:00',
      fcv_tail_number: 'N421YX',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 128,
    })
    expect(entry.oooi).toEqual({
      out: '15:50',
      off: '15:59',
      on: '17:46',
      in: '18:30',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(2.7)
    expect((entry.flight_time as Record<string, unknown>).pic).toBe(2.7)
    expect((entry.flight_time as Record<string, unknown>).crossCountry).toBe(2.7)
    expect(entry.category_class_time).toBe(2.7)
  })

  it('prefers FlightAware actual gate block over FLICA scheduled block (4506 LGA-CAE)', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261112_4506_LGA',
      import_source: 'flica_aerodatabox',
      flight_number: '4506',
      trip_number: 'L8012',
      role: 'PIC',
      dep_airport: 'LGA',
      arr_airport: 'CAE',
      scheduled_out_local: '2026-11-12 11:59:00',
      scheduled_in_local: '2026-11-12 15:17:00',
      actual_out_local: '2026-11-12 12:21:00',
      actual_in_local: '2026-11-12 15:03:00',
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: 'N123YX',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 198,
    })
    expect(entry.oooi?.out).toBe('17:21')
    expect(entry.oooi?.in).toBe('20:03')
    expect(entry.oooi?.isZulu).toBe(true)
    expect((entry.flight_time as Record<string, unknown>).total).toBe(2.7)
    expect(entry.category_class_time).toBe(2.7)
  })

  it('uses FLICA scheduled block when gate actuals are missing', () => {
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
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: 'N12345',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 67,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(1.1)
    expect((entry.flight_time as Record<string, unknown>).pic).toBe(1.1)
    expect((entry.flight_time as Record<string, unknown>).crossCountry).toBe(1.1)
  })

  it('uses actual gate block across midnight (overnight)', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260804_1200_LAX',
      import_source: 'flica_aerodatabox',
      flight_number: '1200',
      trip_number: null,
      role: 'SIC',
      dep_airport: 'LAX',
      arr_airport: 'SFO',
      scheduled_out_local: '2026-08-04 23:50:00',
      scheduled_in_local: '2026-08-05 01:10:00',
      actual_out_local: '2026-08-04 23:55:00',
      actual_in_local: '2026-08-05 01:05:00',
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 90,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(1.2)
    expect((entry.flight_time as Record<string, unknown>).sic).toBe(1.2)
    expect((entry.flight_time as Record<string, unknown>).crossCountry).toBe(1.2)
  })

  it('uses FLICA scheduled Out/In when enrich has only runway times (RIC turn)', () => {
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
      out: '17:10',
      off: '17:27',
      on: '18:18',
      in: '18:26',
      isZulu: true,
    })
    expect(entry.departure).toBe('KRIC')
    expect(entry.destination).toBe('KLGA')
  })

  it('uses enrich gate actuals for Out/In when present (4809 ATL-LGA)', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260820_4809_ATL',
      import_source: 'flica_aerodatabox',
      flight_number: '4809',
      trip_number: 'L7H18',
      role: 'PIC',
      dep_airport: 'ATL',
      arr_airport: 'LGA',
      scheduled_out_local: '2026-08-20 06:06:00',
      scheduled_in_local: '2026-08-20 08:09:00',
      actual_out_local: '2026-08-20 06:09:00',
      actual_in_local: '2026-08-20 08:25:00',
      actual_off_local: '2026-08-20 06:22:00',
      actual_on_local: '2026-08-20 08:04:00',
      fcv_tail_number: 'N648RW',
      fcv_aircraft_type: 'E75',
      crew: [
        { position: 'CA', name: 'FARMER, DEREK' },
        { position: 'FO', name: 'JOHNS, LUKE' },
      ],
      is_deadhead: false,
      block_minutes: 123,
    })
    expect(entry.oooi).toEqual({
      out: '10:09',
      off: '10:22',
      on: '12:04',
      in: '12:25',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(2.3)
    expect(entry.category_class_time).toBe(2.3)
  })

  it('uses all four enrich OOOI in airport-local wall time without mixing scheduled gate times', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260915_5759_LGA',
      import_source: 'flica_aerodatabox',
      flight_number: '5759',
      trip_number: 'L8X01',
      role: 'PIC',
      dep_airport: 'LGA',
      arr_airport: 'BOS',
      scheduled_out_local: '2026-09-15 09:32:00',
      scheduled_in_local: '2026-09-15 10:47:00',
      actual_out_local: '2026-09-15 09:35:00',
      actual_in_local: '2026-09-15 10:50:00',
      actual_off_local: '2026-09-15 09:54:00',
      actual_on_local: '2026-09-15 10:38:00',
      fcv_tail_number: 'N234JQ',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 78,
    })
    expect(entry.oooi).toEqual({
      out: '13:35',
      off: '13:54',
      on: '14:38',
      in: '14:50',
      isZulu: true,
    })
  })

  it('uses FLICA Out→In hours when the pairing omits the block column', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260820_4584_RIC',
      import_source: 'flica_aerodatabox',
      flight_number: '4584',
      trip_number: 'L7H18',
      role: 'PIC',
      dep_airport: 'RIC',
      arr_airport: 'LGA',
      scheduled_out_local: '2026-08-20 11:41:00',
      scheduled_in_local: '2026-08-20 12:56:00',
      actual_out_local: null,
      actual_in_local: null,
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: 'EM7',
      crew: [],
      is_deadhead: false,
      block_minutes: null,
    })
    expect(entry.oooi).toEqual({
      out: '15:41',
      off: null,
      on: null,
      in: '16:56',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(1.3)
  })

  it('computes 0 night for a LAX afternoon Autofi leg (airport-local OOOI)', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261112_1_LAX',
      import_source: 'flica_aerodatabox',
      flight_number: '1',
      trip_number: null,
      role: 'PIC',
      dep_airport: 'LAX',
      arr_airport: 'LAX',
      scheduled_out_local: '2026-11-12 16:00:00',
      scheduled_in_local: '2026-11-12 16:45:00',
      actual_out_local: '2026-11-12 16:00:00',
      actual_in_local: '2026-11-12 16:45:00',
      actual_off_local: '2026-11-12 16:08:00',
      actual_on_local: '2026-11-12 16:40:00',
      fcv_tail_number: 'N12345',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 45,
    })
    expect((entry.flight_time as Record<string, unknown>).night).toBe(0)
    expect((entry.performance as Record<string, unknown>).dayLandings).toBe(1)
    expect((entry.performance as Record<string, unknown>).nightLandings).toBeUndefined()
  })

  it('does not attach landings on deadhead even when the arrival is at night', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261112_2_LAS',
      import_source: 'flica_aerodatabox',
      flight_number: '2',
      trip_number: null,
      role: 'PIC',
      dep_airport: 'LAS',
      arr_airport: 'LAX',
      scheduled_out_local: '2026-11-12 16:30:00',
      scheduled_in_local: '2026-11-12 18:15:00',
      actual_out_local: '2026-11-12 16:30:00',
      actual_in_local: '2026-11-12 18:15:00',
      actual_off_local: null,
      actual_on_local: '2026-11-12 18:05:00',
      fcv_tail_number: '',
      fcv_aircraft_type: '',
      crew: [],
      is_deadhead: true,
      block_minutes: 105,
    })
    expect(entry.tags).toEqual(['Deadhead'])
    expect((entry.performance as Record<string, unknown>).nightLandings).toBeUndefined()
    expect((entry.performance as Record<string, unknown>).dayLandings).toBeUndefined()
  })

  it('stores IND→ORD OOOI as Zulu so On is after Off', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261113_4401_IND',
      import_source: 'flica_aerodatabox',
      flight_number: '4401',
      trip_number: null,
      role: 'PIC',
      dep_airport: 'IND',
      arr_airport: 'ORD',
      scheduled_out_local: '2026-11-13 12:00:00',
      scheduled_in_local: '2026-11-13 12:00:00',
      actual_out_local: '2026-11-13 12:00:00',
      actual_in_local: '2026-11-13 12:00:00',
      actual_off_local: '2026-11-13 12:10:00',
      actual_on_local: '2026-11-13 11:40:00',
      fcv_tail_number: 'N123YX',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 60,
    })
    expect(entry.oooi).toEqual({
      out: '17:00',
      off: '17:10',
      on: '17:40',
      in: '18:00',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(1.0)
  })

  it('keeps same-zone DCA→CMH total 1.5h after storing Zulu OOOI', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261113_4402_DCA',
      import_source: 'flica_aerodatabox',
      flight_number: '4402',
      trip_number: null,
      role: 'PIC',
      dep_airport: 'DCA',
      arr_airport: 'CMH',
      scheduled_out_local: '2026-11-13 10:00:00',
      scheduled_in_local: '2026-11-13 11:30:00',
      actual_out_local: '2026-11-13 10:00:00',
      actual_in_local: '2026-11-13 11:30:00',
      actual_off_local: '2026-11-13 10:12:00',
      actual_on_local: '2026-11-13 11:20:00',
      fcv_tail_number: 'N123YX',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 90,
    })
    expect(entry.oooi).toEqual({
      out: '15:00',
      off: '15:12',
      on: '16:20',
      in: '16:30',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(1.5)
  })

  it('converts DST-day IND→ORD local clocks using IANA zones', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20260715_4403_IND',
      import_source: 'flica_aerodatabox',
      flight_number: '4403',
      trip_number: null,
      role: 'PIC',
      dep_airport: 'IND',
      arr_airport: 'ORD',
      scheduled_out_local: '2026-07-15 13:00:00',
      scheduled_in_local: '2026-07-15 13:00:00',
      actual_out_local: '2026-07-15 13:00:00',
      actual_in_local: '2026-07-15 13:00:00',
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 60,
    })
    expect(entry.oooi).toEqual({
      out: '17:00',
      off: null,
      on: null,
      in: '18:00',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(1.0)
  })

  it('stores a LAX→JFK red-eye as Zulu without changing 5.0h total', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261113_9_LAX',
      import_source: 'flica_aerodatabox',
      flight_number: '9',
      trip_number: null,
      role: 'SIC',
      dep_airport: 'LAX',
      arr_airport: 'JFK',
      scheduled_out_local: '2026-11-13 22:30:00',
      scheduled_in_local: '2026-11-14 06:30:00',
      actual_out_local: '2026-11-13 22:30:00',
      actual_in_local: '2026-11-14 06:30:00',
      actual_off_local: null,
      actual_on_local: null,
      fcv_tail_number: '',
      fcv_aircraft_type: 'E75',
      crew: [],
      is_deadhead: false,
      block_minutes: 300,
    })
    expect(entry.oooi).toEqual({
      out: '06:30',
      off: null,
      on: null,
      in: '11:30',
      isZulu: true,
    })
    expect((entry.flight_time as Record<string, unknown>).total).toBe(5.0)
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

describe('deadhead legs', () => {
  it('log no seat, cross-country or night time and need no seat', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261103_9001_SEA',
      import_source: 'flica_aerodatabox',
      flight_number: '9001',
      trip_number: 'T0000',
      role: 'SIC',
      dep_airport: 'SEA',
      arr_airport: 'PDX',
      scheduled_out_local: '2026-11-03 18:30:00',
      scheduled_in_local: '2026-11-03 19:40:00',
      actual_out_local: '2026-11-03 18:32:00',
      actual_in_local: '2026-11-03 19:38:00',
      actual_off_local: '2026-11-03 18:45:00',
      actual_on_local: '2026-11-03 19:30:00',
      fcv_tail_number: 'N900ZZ',
      fcv_aircraft_type: 'E75',
      crew: [
        { position: 'CA', name: 'DOE, JANE' },
        { position: 'FO', name: 'ROE, RICHARD' },
      ],
      is_deadhead: true,
      block_minutes: 66,
    })

    expect(entry.flight_time).toEqual({})
    expect(entry.category_class_time).toBeNull()
    expect(entry.flight_conditions).toEqual([])
    expect(entry.performance).toEqual({})
    expect(entry.tags).toEqual(['Deadhead'])
    expect(isDeadheadMappedFlight(entry)).toBe(true)
  })
})

describe('entry date', () => {
  it('uses the block-out date when takeoff is after midnight', () => {
    const entry = mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261104_9003_SEA',
      import_source: 'flica_aerodatabox',
      flight_number: '9003',
      trip_number: 'T0000',
      role: 'PIC',
      dep_airport: 'SEA',
      arr_airport: 'PDX',
      scheduled_out_local: '2026-11-04 23:40:00',
      scheduled_in_local: '2026-11-05 00:50:00',
      actual_out_local: '2026-11-04 23:52:00',
      actual_in_local: '2026-11-05 01:05:00',
      actual_off_local: '2026-11-05 00:15:00',
      actual_on_local: '2026-11-05 00:58:00',
      fcv_tail_number: 'N900ZZ',
      fcv_aircraft_type: 'E75',
      crew: [{ position: 'CA', name: 'DOE, JANE' }],
      is_deadhead: false,
      block_minutes: 73,
    })
    expect(entry.date).toBe('2026-11-04')
  })
})

describe('Autofi takeoffs and landings', () => {
  const leg = (overrides: Partial<Parameters<typeof mapAirlineLegToFcvMappedEntry>[0]> = {}) =>
    mapAirlineLegToFcvMappedEntry({
      external_flight_id: 'FLICA_20261103_9101_SEA',
      import_source: 'flica_aerodatabox',
      flight_number: '9101',
      trip_number: 'T0000',
      role: 'SIC',
      dep_airport: 'SEA',
      arr_airport: 'PDX',
      scheduled_out_local: '2026-11-03 05:00:00',
      scheduled_in_local: '2026-11-03 06:30:00',
      actual_out_local: '2026-11-03 05:05:00',
      actual_in_local: '2026-11-03 06:30:00',
      actual_off_local: '2026-11-03 05:20:00',
      actual_on_local: '2026-11-03 06:20:00',
      fcv_tail_number: 'N900ZZ',
      fcv_aircraft_type: 'E75',
      crew: [
        { position: 'CA', name: 'DOE, JANE' },
        { position: 'FO', name: 'ROE, RICHARD' },
      ],
      is_deadhead: false,
      block_minutes: 85,
      ...overrides,
    })

  it('logs a night takeoff and a day landing on the same leg', () => {
    expect(leg().performance).toEqual({ nightTakeoffs: 1, dayLandings: 1 })
  })

  it('logs a day takeoff and a night landing on the same leg', () => {
    const entry = leg({
      scheduled_out_local: '2026-11-03 16:45:00',
      scheduled_in_local: '2026-11-03 18:20:00',
      actual_out_local: '2026-11-03 16:50:00',
      actual_off_local: '2026-11-03 17:00:00',
      actual_on_local: '2026-11-03 18:10:00',
      actual_in_local: '2026-11-03 18:20:00',
    })
    expect(entry.performance).toEqual({ dayTakeoffs: 1, nightLandings: 1 })
  })

  it('leaves takeoffs null when the departure airport is unresolved', () => {
    const entry = leg({ dep_airport: 'ZZZQ', external_flight_id: 'FLICA_20261103_9101_ZZZQ' })
    const perf = entry.performance as Record<string, unknown>
    expect(perf.dayTakeoffs).toBeUndefined()
    expect(perf.nightTakeoffs).toBeUndefined()
  })

  it('logs nothing for a deadhead', () => {
    expect(leg({ is_deadhead: true }).performance).toEqual({})
  })
})

