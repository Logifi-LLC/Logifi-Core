import { describe, it, expect } from 'vitest'
import {
  assertFiniteCoreNumbers,
  createImporter,
  getImporter,
  parseWithProvider,
  providerKeyToBridgeSource,
  type ImportProviderKey,
} from '../import'

const FIXED_ID = () => 'test-import-id'

function expectCleanRecords(
  provider: ImportProviderKey,
  content: string,
  expectations: {
    minRecords?: number
    date?: string
    registration?: string
    departure?: string
    arrival?: string
    totalDuration?: number | null
    picTime?: number | null
    landingsDay?: number | null
    landingsNight?: number | null
  }
) {
  const result = parseWithProvider(provider, content, { generateId: FIXED_ID })
  expect(result.provider).toBe(provider)
  expect(result.bridgeSource).toBe(providerKeyToBridgeSource(provider))
  expect(result.records.length).toBeGreaterThanOrEqual(expectations.minRecords ?? 1)

  for (const record of result.records) {
    expect(assertFiniteCoreNumbers(record)).toBe(true)
    expect(Number.isNaN(record.totalDuration as number)).toBe(false)
    expect(Number.isNaN(record.picTime as number)).toBe(false)
    expect(Number.isNaN(record.dualReceived as number)).toBe(false)
    expect(Number.isNaN(record.landingsDay as number)).toBe(false)
    expect(Number.isNaN(record.landingsNight as number)).toBe(false)
  }

  const first = result.records[0]!
  if (expectations.date !== undefined) expect(first.date).toBe(expectations.date)
  if (expectations.registration !== undefined) {
    expect(first.aircraftRegistration).toBe(expectations.registration)
  }
  if (expectations.departure !== undefined) {
    expect(first.departureAirport).toBe(expectations.departure)
  }
  if (expectations.arrival !== undefined) {
    expect(first.arrivalAirport).toBe(expectations.arrival)
  }
  if (expectations.totalDuration !== undefined) {
    expect(first.totalDuration).toBe(expectations.totalDuration)
  }
  if (expectations.picTime !== undefined) expect(first.picTime).toBe(expectations.picTime)
  if (expectations.landingsDay !== undefined) {
    expect(first.landingsDay).toBe(expectations.landingsDay)
  }
  if (expectations.landingsNight !== undefined) {
    expect(first.landingsNight).toBe(expectations.landingsNight)
  }

  expect(result.entries.length).toBe(result.records.length)
  expect(() => createImporter(provider).parse(content, { generateId: FIXED_ID })).not.toThrow()
}

describe('ImporterFactory', () => {
  it('maps provider keys to bridge sources', () => {
    expect(providerKeyToBridgeSource('foreflight')).toBe('foreflight')
    expect(providerKeyToBridgeSource('myflightbook')).toBe('myflightbook')
    expect(providerKeyToBridgeSource('logten')).toBe('logten')
    expect(providerKeyToBridgeSource('custom_csv')).toBe('generic')
  })

  it('returns the same driver from getImporter and createImporter', () => {
    expect(getImporter('foreflight')).toBe(createImporter('foreflight'))
  })

  it('parses ForeFlight dual-table CSV into core records without NaN', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N172SP,Cessna,172S,ASEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,DayLandingsFullStop,NightLandingsFullStop,PilotComments',
      '2024-06-13,N172SP,KIND,KORD,1.5,1.5,1,0,Cross country dual',
    ].join('\n')

    expectCleanRecords('foreflight', csv, {
      date: '2024-06-13',
      registration: 'N172SP',
      departure: 'KIND',
      arrival: 'KORD',
      totalDuration: 1.5,
      picTime: 1.5,
      landingsDay: 1,
      landingsNight: 0,
    })

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.records[0]!.aircraftType.toLowerCase()).toContain('172')
    expect(result.records[0]!.remarks.toLowerCase()).toContain('cross country')
  })

  it('parses MyFlightBook CSV preferring FS Day/Night landings', () => {
    const csv = [
      'Date,Tail Number,Model,Total Flight Time,Route,PIC,SIC,Night,X-Country,Landings,FS Day Landings,FS Night Landings,IMC,Simulated Instrument,Dual Received,CFI,Approaches,Hold,Comments',
      '6/13/2024,N172SP,C-172,1.5,KIND KORD,1.5,,,1.5,3,2,1,,,0,,0,No,MFB sample flight',
    ].join('\n')

    expectCleanRecords('myflightbook', csv, {
      date: '2024-06-13',
      registration: 'N172SP',
      departure: 'KIND',
      arrival: 'KORD',
      totalDuration: 1.5,
      picTime: 1.5,
      // Prefer FS breakdown over total Landings=3
      landingsDay: 2,
      landingsNight: 1,
    })

    const result = parseWithProvider('myflightbook', csv, { generateId: FIXED_ID })
    expect(result.records[0]!.remarks).toContain('MFB sample')
  })

  it('parses LogTen native tab-delimited export without throwing', () => {
    const tsv = [
      [
        'flight_flightDate',
        'aircraft_aircraftID',
        'aircraftType_make',
        'aircraftType_model',
        'aircraftType_selectedAircraftClass',
        'flight_from',
        'flight_to',
        'flight_totalTime',
        'flight_pic',
        'flight_nightTime',
        'flight_crossCountry',
        'flight_dayLandings',
        'flight_nightLandings',
        'Remarks',
      ].join('\t'),
      [
        '2025-11-11',
        'N430YX',
        'EMBRAER',
        'EMB-170/175',
        'Multi-Engine Land',
        'KLGA',
        'KDCA',
        '1.5',
        '1.5',
        '0',
        '1.5',
        '1',
        '0',
        'Line flight',
      ].join('\t'),
    ].join('\n')

    expectCleanRecords('logten', tsv, {
      date: '2025-11-11',
      registration: 'N430YX',
      departure: 'KLGA',
      arrival: 'KDCA',
      totalDuration: 1.5,
      picTime: 1.5,
      landingsDay: 1,
      landingsNight: 0,
    })
  })

  it('parses LogTen Dynamic Export (Tab) headers', () => {
    const tsv = [
      [
        'Date',
        'Flight #',
        'Aircraft ID',
        'Aircraft Type',
        'From',
        'To',
        'Total Time',
        'PIC/P1 Crew',
        'SIC/P2 Crew',
        'Day Ldg',
        'Night Ldg',
        'Approach 1',
        'Multi-Engine Land',
        'Jet',
        'Pilot Flying',
      ].join('\t'),
      [
        '2025-11-11',
        '4487',
        'N430YX',
        'E170',
        'KLGA',
        'KDCA',
        '1.5',
        'Derek Farmer',
        'WILLIAM RIDDLE',
        '1',
        '0',
        '1;01;KDCA',
        '1.5',
        '1.5',
        '1',
      ].join('\t'),
    ].join('\n')

    expectCleanRecords('logten', tsv, {
      date: '2025-11-11',
      registration: 'N430YX',
      departure: 'KLGA',
      arrival: 'KDCA',
      totalDuration: 1.5,
      landingsDay: 1,
      landingsNight: 0,
    })
  })

  it('imports ForeFlight blank AircraftID as NO TAIL', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N172SP,Cessna,172S,ASEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,PilotComments',
      '2022-10-21,,KPIE,KPIE,2.0,2.0,PPL PASS',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.entries).toHaveLength(1)
    expect(result.skipped).toBe(0)
    expect(result.records[0]!.aircraftRegistration).toBe('NO TAIL')
    expect(result.records[0]!.totalDuration).toBe(2)
    expect(result.warnings.some((w) => w.includes('NO TAIL'))).toBe(true)
  })

  it('tags ForeFlight custom [Hours] columns when value > 0 without filling XC', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N172SP,Cessna,172S,ASEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,CrossCountry,[Hours]135 XC Time',
      '2024-06-13,N172SP,KIND,KORD,1.5,1.5,,1.2',
      '2024-06-14,N172SP,KIND,KORD,1.0,1.0,1.0,0',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.entries).toHaveLength(2)

    const tagged = result.entries[0]!
    expect(tagged.tags).toContain('135 XC')
    expect(tagged.flightTime.crossCountry).toBeNull()

    const untagged = result.entries[1]!
    expect(untagged.tags ?? []).not.toContain('135 XC')
    expect(untagged.flightTime.crossCountry).toBe(1)
    expect(result.warnings.some((w) => w.includes('135 XC'))).toBe(true)
  })

  it('parses ForeFlight Approach1 and Approach2 into approaches[]', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N172SP,Cessna,172S,ASEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,Approach1,Approach2',
      '2024-06-13,N172SP,KGWB,KGWB,1.2,1.2,1;ILS OR LOC RWY 27;27;KGWB;;CIRCLE,1;RNAV (GPS) RWY 09;09;KGWB;;',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    const perf = result.entries[0]!.performance
    expect(perf.approaches).toEqual([
      { type: 'ILS OR LOC RWY 27', count: 1 },
      { type: 'RNAV (GPS) RWY 09', count: 1 },
    ])
    expect(perf.approachCount).toBe(2)
    expect(perf.approachType).toBe('ILS OR LOC RWY 27')
  })

  it('parses ForeFlight export with banner, comma blanks, and Flights Table title', () => {
    const csv = [
      'ForeFlight Logbook Import,This row is required for importing into ForeFlight. Do not delete or modify.',
      ',,,,,,,,',
      'Aircraft Table,,,,,,,,',
      'AircraftID,TypeCode,Year,Make,Model,GearType,EngineType,equipType (FAA),aircraftClass (FAA)',
      'REDBIRD,,,,,,,,',
      'N564PU,P28A,,AICSA,Warrior II,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      ',,,,,,,,',
      'N572DS,DA40,,Diamond,DA-40XLS,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      'N278DC,DV20,,Diamond,DA-20-C1,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      'N660DC,DV20,,Diamond,DA-20-C1,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      'No tail number,,,,,,,aircraft,',
      ',,,,,,,,',
      'Flights Table , , , , , , , ,',
      'Date,AircraftID,From,To,TotalTime,PIC',
      '2026-08-09,N572DS,KSMD,KSMD,2.2,2.2',
      '2022-04-01,,KPIE,KPIE,2.0,2.0',
      '2023-05-21,N278DC,KSMD,KSMD,1.2,1.2',
      '2023-08-12,N660DC,KSMD,KSMD,1.0,1.0',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.entries).toHaveLength(4)

    const byReg = Object.fromEntries(
      result.entries.map((e) => [e.registration, e])
    )
    expect(byReg.N572DS?.aircraftCategoryClass).toBe('ASEL')
    expect(byReg.N278DC?.aircraftCategoryClass).toBe('ASEL')
    expect(byReg.N660DC?.aircraftCategoryClass).toBe('ASEL')
    expect(byReg['NO TAIL']?.aircraftCategoryClass).toBe('ASEL')
    expect(byReg.N572DS?.aircraftMakeModel.toLowerCase()).toContain('da-40')
  })

  it('joins make/model from headerless ForeFlight hangar rows', () => {
    const csv = [
      'N572DS,DA40,,Diamond,DA-40XLS,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      'N278DC,DV20,,Diamond,DA-20-C1,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      'N660DC,DV20,,Diamomd,DA-20-C1,fixed_tricycle,Piston,aircraft,airplane_single_engine_land',
      'N682CA,SR20,,,,,,,,',
      ',,,,,,,,',
      'Date,AircraftID,From,To,TotalTime,PIC',
      '2026-08-09,N572DS,KSMD,KSMD,2.2,2.2',
      '2023-05-21,N278DC,KSMD,KSMD,1.6,1.6',
      '2023-08-12,N660DC,KSMD,C62,1.4,1.4',
      '2024-01-01,N682CA,KSMD,KSMD,1.0,1.0',
      '2022-04-01,,KPIE,KPIE,1.7,0',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    const byReg = Object.fromEntries(result.entries.map((e) => [e.registration, e]))

    expect(byReg.N572DS?.aircraftMakeModel.toLowerCase()).toMatch(/diamond|da-40/)
    expect(byReg.N660DC?.aircraftMakeModel.toLowerCase()).toMatch(/da-20|diamomd|diamond/)
    expect(byReg.N278DC?.aircraftMakeModel.toLowerCase()).toMatch(/da-20|diamond/)
    expect(byReg.N682CA?.aircraftMakeModel).toBe('SR20')
    expect(byReg['NO TAIL']?.aircraftMakeModel || '').not.toMatch(/diamond|da-40|da-20|sr20/i)
  })

  it('joins ForeFlight aircraftClass (FAA) onto ASEL / AMEL', () => {
    const csv = [
      'AircraftID,Make,Model,equipType (FAA),aircraftClass (FAA)',
      'N172SP,Cessna,172S,aircraft,airplane_single_engine_land',
      'N142GS,Diamond,DA-42-NG,aircraft,airplane_multi_engine_land',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC',
      '2024-06-13,N172SP,KIND,KORD,1.5,1.5',
      '2024-06-14,N142GS,KSMD,KSMD,1.2,1.2',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.entries[0]!.aircraftCategoryClass).toBe('ASEL')
    expect(result.entries[1]!.aircraftCategoryClass).toBe('AMEL')
  })

  it('marks simulator only when SimulatedFlight is greater than zero', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N172SP,Cessna,172S,ASEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,SimulatedFlight',
      '2024-06-13,N172SP,KIND,KORD,1.5,1.5,0.0',
      '2024-06-14,N172SP,KIND,KORD,1.2,1.2,1.5',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.entries[0]!.logbookType).not.toBe('simulator')
    expect(result.entries[1]!.logbookType).toBe('simulator')
  })

  it('maps ForeFlight FAA milestone flags to tags', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N172SP,Cessna,172S,ASEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,Flight Review (FAA),IPC (FAA),Checkride (FAA)',
      '2024-06-13,N172SP,KIND,KORD,1.5,1.5,TRUE,,',
      '2024-06-14,N172SP,KIND,KORD,1.2,1.2,,TRUE,',
      '2024-06-15,N172SP,KIND,KORD,1.0,1.0,,,TRUE',
    ].join('\n')

    const result = parseWithProvider('foreflight', csv, { generateId: FIXED_ID })
    expect(result.entries[0]!.tags).toContain('Flight Review')
    expect(result.entries[1]!.tags).toContain('IPC')
    expect(result.entries[2]!.tags).toContain('Checkride')
  })

  it('parses Excel / Standard CSV (custom_csv → generic)', () => {
    const csv = [
      'Date,Aircraft ID,Total Time,PIC,Departure,Destination,Day Landings,Night Landings,Remarks',
      '2024-06-13,N12345,2.0,2.0,KPAE,KBFI,1,0,Standard CSV sample',
    ].join('\n')

    expectCleanRecords('custom_csv', csv, {
      date: '2024-06-13',
      registration: 'N12345',
      departure: 'KPAE',
      arrival: 'KBFI',
      totalDuration: 2,
      picTime: 2,
      landingsDay: 1,
      landingsNight: 0,
    })
  })
})
