import { describe, it, expect } from 'vitest'
import {
  buildForeFlightRouteIntermediate,
  buildFullRoute,
  formatExportDate,
  formatRegistrationForExport,
  parseImportDate,
} from '../logbookDataBridge/formatters'
import {
  FOREFLIGHT_FLIGHT_HEADERS,
  LOGTEN_HEADERS,
  MYFLIGHTBOOK_HEADERS,
  mapEntryToForeFlightFlightRow,
  mapEntryToLogTenRow,
  mapEntryToMyFlightbookRow,
} from '../logbookDataBridge/exportMappers'
import { mapRawRowToLogEntry } from '../logbookDataBridge/importMappers'
import {
  buildHeaderRowObject,
  exportToForeFlight,
  exportToMyFlightbook,
} from '../logbookDataBridge/exportService'
import { ingestBridgeFile } from '../logbookDataBridge/importService'
import { detectBridgeSource } from '../logbookDataBridge/sourceDetector'
import { parseBridgeFile } from '../logbookDataBridge/fileParser'
import {
  enrichLogtenDynamicExportRow,
  applyLogtenDynamicRoleAndTime,
  isLogtenDynamicExportHeaders,
  namesMatchFlexible,
  parseLogtenApproach1,
} from '../logbookDataBridge/logtenDynamicExport'
import { validatePart61RequiredFields } from '../../app/utils/validation'
import { applyLogtenCrewFields, inferImporterSeat } from '../../app/utils/logbookImportEnrichments'
import type { LogEntry } from '../../app/utils/logbookTypes'
import {
  catalogAircraftFamilyKey,
  UNKNOWN_AIRCRAFT_FAMILY,
} from '../catalogAircraftFamily'

const LOGTEN_NATIVE_SAMPLE_ROW = {
  flight_flightDate: '2025-11-11',
  flight_flightNumber: '4487',
  flight_from: 'KLGA',
  flight_to: 'KDCA',
  flight_selectedCrewPIC: 'Derek Farmer',
  flight_selectedCrewSIC: 'WILLIAM RIDDLE',
  flight_actualDepartureTime: '12:16',
  flight_actualArrivalTime: '13:21',
  flight_takeoffTime: '12:29',
  flight_landingTime: '13:14',
  flight_totalTime: '1.08',
  flight_pic: '1.08',
  flight_selectedApproach1: '1;01;KDCA',
  flight_dayLandings: '1',
  aircraft_aircraftID: 'N430YX',
  aircraftType_make: 'EMBRAER (Brazil)',
  aircraftType_model: 'EMB-170/175',
  aircraftType_selectedAircraftClass: 'Multi-Engine Land',
}

const LOGTEN_NATIVE_SIC_TIME_ROW = {
  flight_flightDate: '2026-06-13',
  flight_flightNumber: '0003',
  flight_from: 'KBDL',
  flight_to: 'KBUF',
  flight_selectedCrewPIC: 'Derek Farmer',
  flight_selectedCrewSIC: 'Ron Weasley',
  flight_totalTime: '3.00',
  flight_sic: '3.00',
  flight_pic: '',
  aircraft_aircraftID: 'N855RW',
  aircraftType_model: 'EMB-170/175',
  aircraftType_selectedAircraftClass: 'Multi-Engine Land',
}

const LOGTEN_DYNAMIC_HEADERS = [
  'Date',
  'Flight #',
  'Aircraft ID',
  'Aircraft Type',
  'From',
  'To',
  'Out',
  'Off',
  'On',
  'In',
  'Total Time',
  'PIC/P1 Crew',
  'SIC/P2 Crew',
  'Day Ldg',
  'Approach 1',
  'Multi-Engine Land',
  'Jet',
  'Pilot Flying',
]

const LOGTEN_DYNAMIC_SAMPLE_ROW = {
  Date: '2025-11-11',
  'Flight #': '4487',
  'Aircraft ID': 'N430YX',
  'Aircraft Type': 'E170',
  From: 'KLGA',
  To: 'KDCA',
  Out: '1216',
  In: '1321',
  'Total Time': '1.08',
  'PIC/P1 Crew': 'Derek Farmer',
  'SIC/P2 Crew': 'WILLIAM RIDDLE',
  'Pilot Flying': '1',
  'Day Ldg': '1',
  'Approach 1': '1;01;KDCA',
  'Multi-Engine Land': '1.08',
  Jet: '1.08',
}

function createTestEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
    date: '2024-06-13',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'Cessna 172',
    registration: '172P',
    flightNumber: null,
    departure: 'KIND',
    destination: 'KORD',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: 'Test flight',
    flightTime: {
      total: 1.5,
      pic: 1.5,
      sic: null,
      dual: null,
      solo: null,
      night: null,
      actualInstrument: null,
      simulatedInstrument: null,
      crossCountry: 1.5,
      dualGiven: null,
    },
    performance: {
      dayTakeoffs: null,
      dayLandings: 1,
      nightTakeoffs: null,
      nightLandings: 0,
      approachCount: null,
      approachType: null,
      holdingProcedures: null,
    },
    ...overrides,
  }
}

describe('logbookDataBridge formatters', () => {
  it('prepends N to US bare tail numbers', () => {
    expect(formatRegistrationForExport('172P')).toBe('N172P')
    expect(formatRegistrationForExport('N172P')).toBe('N172P')
    expect(formatRegistrationForExport('#123456')).toBe('#123456')
  })

  it('formats and parses dates per platform', () => {
    expect(formatExportDate('2024-06-13', 'iso')).toBe('2024-06-13')
    expect(formatExportDate('2024-06-13', 'mdy')).toBe('6/13/2024')
    expect(parseImportDate('6/13/2024')).toBe('2024-06-13')
  })

  it('builds full route strings', () => {
    expect(buildFullRoute('KIND', '', 'KORD')).toBe('KIND KORD')
    expect(buildFullRoute('KIND', 'KMCX', 'KORD')).toBe('KIND KMCX KORD')
    expect(buildForeFlightRouteIntermediate('KIND', 'KMCX', 'KORD')).toBe('KMCX')
  })
})

describe('logbookDataBridge sourceDetector', () => {
  it('detects ForeFlight headers', () => {
    expect(
      detectBridgeSource(['Date', 'AircraftID', 'From', 'To', 'TotalTime', 'PIC'])
    ).toBe('foreflight')
  })

  it('detects LogTen TSV-style headers', () => {
    expect(
      detectBridgeSource(['Flight_Date', 'Aircraft_Registration', 'flight_from'])
    ).toBe('logten')
  })

  it('detects MyFlightbook headers', () => {
    expect(detectBridgeSource(['Date', 'Tail Number', 'Total Flight Time'])).toBe(
      'myflightbook'
    )
  })

  it('detects LogTen native export headers', () => {
    expect(
      detectBridgeSource(['flight_flightDate', 'aircraft_aircraftID', 'flight_pic', 'flight_from'])
    ).toBe('logten')
  })

  it('detects LogTen Dynamic Export headers over ForeFlight', () => {
    expect(detectBridgeSource(LOGTEN_DYNAMIC_HEADERS)).toBe('logten')
    expect(
      detectBridgeSource([
        'Date',
        'Aircraft ID',
        'From',
        'To',
        'Total Time',
        'Flight #',
        'PIC/P1 Crew',
        'Multi-Engine Land',
      ])
    ).toBe('logten')
  })

  it('identifies LogTen Dynamic Export header signature', () => {
    expect(isLogtenDynamicExportHeaders(LOGTEN_DYNAMIC_HEADERS)).toBe(true)
    expect(isLogtenDynamicExportHeaders(['Date', 'Aircraft ID', 'From', 'To'])).toBe(false)
  })
})

describe('logbookDataBridge importMappers', () => {
  it('maps ForeFlight row with TotalTime and PilotComments', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        AircraftID: '172P',
        From: 'KIND',
        To: 'KORD',
        TotalTime: '1.5',
        PIC: '1.5',
        PilotComments: 'Nice flight',
      },
      { source: 'foreflight' }
    )
    expect(entry?.date).toBe('2024-06-13')
    expect(entry?.registration).toBe('N172P')
    expect(entry?.flightTime.total).toBe(1.5)
    expect(entry?.remarks).toBe('Nice flight')
  })

  it('maps LogTen TSV row with Flight_Date and Aircraft_Registration', () => {
    const entry = mapRawRowToLogEntry(
      {
        Flight_Date: '2024-03-01',
        Aircraft_Registration: 'N12345',
        flight_from: 'KPAO',
        flight_to: 'KSFO',
        flight_totalTime: '2.0',
        flight_pic: '2.0',
      },
      { source: 'logten' }
    )
    expect(entry?.date).toBe('2024-03-01')
    expect(entry?.registration).toBe('N12345')
    expect(entry?.departure).toBe('KPAO')
  })

  it('maps MyFlightbook M/d/yyyy date', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '6/13/2024',
        'Tail Number': 'N99999',
        'Total Flight Time': '1.2',
        Route: 'KIND KORD',
        PIC: '1.2',
      },
      { source: 'myflightbook' }
    )
    expect(entry?.date).toBe('2024-06-13')
    expect(entry?.flightTime.total).toBe(1.2)
  })

  it('maps MyFlightbook Hold Yes to holdingProcedures', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2026-06-13',
        'Tail Number': 'N432YX',
        'Total Flight Time': '9.0',
        Route: 'KLGA KFWA KLGA',
        Approaches: '2',
        Hold: 'Yes',
      },
      { source: 'myflightbook' }
    )
    expect(entry?.performance.holdingProcedures).toBe(1)
    expect(entry?.performance.approachCount).toBe(2)
  })

  it('infers Dual Received when PIC is empty and DualReceived is set', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2022-04-01',
        AircraftID: '',
        From: 'KPIE',
        To: 'KPIE',
        TotalTime: '2.0',
        PIC: '0.0',
        DualReceived: '2.0',
      },
      { source: 'foreflight' }
    )
    expect(entry?.registration).toBe('NO TAIL')
    expect(entry?.role).toBe('Dual Received')
    expect(entry?.flightTime.dual).toBe(2)
  })

  it('infers Instructor when only DualGiven is set', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        AircraftID: 'N172P',
        From: 'KIND',
        To: 'KORD',
        TotalTime: '1.5',
        PIC: '0',
        DualGiven: '1.5',
      },
      { source: 'foreflight' }
    )
    expect(entry?.role).toBe('Instructor')
  })

  it('imports ForeFlight blank AircraftID as NO TAIL', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2022-10-21',
        AircraftID: '',
        From: 'KPIE',
        To: 'KPIE',
        TotalTime: '2.0',
      },
      { source: 'foreflight' }
    )
    expect(entry?.registration).toBe('NO TAIL')
    expect(entry?.flightTime.total).toBe(2)
  })

  it('does not treat SimulatedFlight 0.0 as simulator', () => {
    const zero = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        AircraftID: 'N172P',
        From: 'KIND',
        To: 'KORD',
        TotalTime: '1.5',
        SimulatedFlight: '0.0',
      },
      { source: 'foreflight' }
    )
    expect(zero?.logbookType).not.toBe('simulator')

    const sim = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        AircraftID: 'N172P',
        From: 'KIND',
        To: 'KORD',
        TotalTime: '1.5',
        SimulatedFlight: '1.2',
      },
      { source: 'foreflight' }
    )
    expect(sim?.logbookType).toBe('simulator')
  })

  it('maps ForeFlight Approach1 and Approach2 slots', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        AircraftID: 'N172P',
        From: 'KGWB',
        To: 'KGWB',
        TotalTime: '1.2',
        Approach1: '1;ILS OR LOC RWY 27;27;KGWB;;CIRCLE',
        Approach2: '1;RNAV (GPS) RWY 09;09;KGWB;;',
      },
      { source: 'foreflight' }
    )
    expect(entry?.performance.approaches).toEqual([
      { type: 'ILS OR LOC RWY 27', count: 1 },
      { type: 'RNAV (GPS) RWY 09', count: 1 },
    ])
    expect(entry?.performance.approachCount).toBe(2)
  })

  it('maps numeric Holds from ForeFlight-style exports', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        AircraftID: 'N172P',
        From: 'KIND',
        To: 'KORD',
        TotalTime: '1.5',
        Holds: '2',
      },
      { source: 'foreflight' }
    )
    expect(entry?.performance.holdingProcedures).toBe(2)
  })

  it('maps LogTen Dynamic Export row with Flight # and Aircraft Type', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_DYNAMIC_SAMPLE_ROW, { source: 'logten' })
    expect(entry?.date).toBe('2025-11-11')
    expect(entry?.registration).toBe('N430YX')
    expect(entry?.flightNumber).toBe('4487')
    expect(entry?.aircraftMakeModel).toBe('E170')
    expect(entry?.departure).toBe('KLGA')
    expect(entry?.destination).toBe('KDCA')
    expect(entry?.flightTime.total).toBe(1.1)
    expect(entry?.performance.dayLandings).toBe(1)
  })

  it('enriches LogTen Dynamic Export row for PIC role and validation', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_DYNAMIC_SAMPLE_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    enrichLogtenDynamicExportRow(entry!, LOGTEN_DYNAMIC_SAMPLE_ROW, 'Derek Farmer')
    applyLogtenDynamicRoleAndTime(entry!, LOGTEN_DYNAMIC_SAMPLE_ROW, 'Derek Farmer')

    expect(entry?.role).toBe('PIC')
    expect(entry?.flightTime.pic).toBe(1.1)
    expect(entry?.aircraftCategoryClass).toBe('AMEL')
    expect(entry?.performance.approaches).toEqual([{ type: '01', count: 1 }])

    const errors = validatePart61RequiredFields(entry!).filter((r) => r.type === 'error')
    expect(errors).toHaveLength(0)
  })

  it('prefers full Aircraft Type over shorthand from mapRawRowToLogEntry on dynamic export', () => {
    const row = {
      ...LOGTEN_DYNAMIC_SAMPLE_ROW,
      'Aircraft Type': 'EMBRAER (Brazil) EMB-170/175',
    }
    const entry = mapRawRowToLogEntry(row, { source: 'logten' })
    expect(entry?.aircraftMakeModel).toBe('EMBRAER (Brazil) EMB-170/175')
    enrichLogtenDynamicExportRow(entry!, row, 'Derek Farmer')
    expect(entry?.aircraftMakeModel).toBe('EMBRAER (Brazil) EMB-170/175')
  })

  it('assigns PIC time for LogTen Dynamic Export without pilot profile name', () => {
    const rowWithoutPilotFlying = {
      ...LOGTEN_DYNAMIC_SAMPLE_ROW,
      'Pilot Flying': '',
    }
    const entry = mapRawRowToLogEntry(rowWithoutPilotFlying, { source: 'logten' })
    expect(entry).not.toBeNull()
    enrichLogtenDynamicExportRow(entry!, rowWithoutPilotFlying, '')
    applyLogtenDynamicRoleAndTime(entry!, rowWithoutPilotFlying, '')

    expect(entry?.role).toBe('PIC')
    expect(entry?.flightTime.pic).toBe(1.1)
  })

  it('matches crew names flexibly by last name and first initial', () => {
    expect(namesMatchFlexible('Derek Farmer', 'DEREK FARMER')).toBe(true)
    expect(namesMatchFlexible('Derek Farmer', 'Farmer, Derek')).toBe(false)
    expect(namesMatchFlexible('D Farmer', 'Derek Farmer')).toBe(true)
    expect(namesMatchFlexible('Derek', 'Derek Farmer')).toBe(true)
    expect(namesMatchFlexible('Derek Farmer', 'Derek')).toBe(true)
  })

  it('parses LogTen Approach 1 semicolon format', () => {
    expect(parseLogtenApproach1('1;01;KDCA')).toEqual({ count: 1, type: '01' })
    expect(parseLogtenApproach1('1;30R;KSTL')).toEqual({ count: 1, type: '30R' })
    expect(parseLogtenApproach1('')).toBeNull()
  })

  it('maps LogTen native export row with flight_pic and approach', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SAMPLE_ROW, { source: 'logten' })
    expect(entry?.date).toBe('2025-11-11')
    expect(entry?.registration).toBe('N430YX')
    expect(entry?.flightNumber).toBe('4487')
    expect(entry?.role).toBe('PIC')
    expect(entry?.flightTime.pic).toBe(1.1)
    expect(entry?.flightTime.total).toBeNull()
    expect(entry?.aircraftCategoryClass).toBe('AMEL')
    expect(entry?.performance.approaches).toEqual([{ type: '01', count: 1 }])
  })

  it('assigns other crew member for LogTen native PIC import', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SAMPLE_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, LOGTEN_NATIVE_SAMPLE_ROW, 'Derek Farmer')

    expect(entry?.trainingElements).toBe('William Riddle')
    expect(entry?.trainingInstructor).toBe('First Officer')

    const errors = validatePart61RequiredFields(entry!).filter((r) => r.type === 'error')
    expect(errors.every((e) => e.field === 'total')).toBe(true)
  })

  it('infers SIC seat when only SIC time logged but both crew columns populated', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SIC_TIME_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    expect(entry?.role).toBe('SIC')
    expect(entry?.flightTime.sic).toBe(3)

    const seat = inferImporterSeat(
      entry!,
      'Derek Farmer',
      'Ron Weasley',
      'Test Test'
    )
    expect(seat).toBe('SIC')
  })

  it('assigns Ron Weasley as Captain for SIC-only time row with non-matching profile', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SIC_TIME_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, LOGTEN_NATIVE_SIC_TIME_ROW, 'Test Test')

    expect(entry?.trainingElements).toBe('Derek Farmer')
    expect(entry?.trainingInstructor).toBe('Captain')
    expect(entry?.role).toBe('SIC')
  })

  it('assigns Ron Weasley as Captain when profile is in PIC column but SIC time logged', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SIC_TIME_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, LOGTEN_NATIVE_SIC_TIME_ROW, 'Derek Farmer')

    expect(entry?.trainingElements).toBe('Ron Weasley')
    expect(entry?.trainingInstructor).toBe('Captain')
    expect(entry?.role).toBe('SIC')
  })
})

describe('logbookDataBridge export', () => {
  it('maps MyFlightbook row with exact headers', () => {
    const row = mapEntryToMyFlightbookRow(createTestEntry())
    const obj = buildHeaderRowObject(MYFLIGHTBOOK_HEADERS, row)
    expect(obj['Date']).toBe('6/13/2024')
    expect(obj['Tail Number']).toBe('N172P')
    expect(obj['Total Flight Time']).toBe('1.5')
    expect(obj['Route']).toBe('KIND KORD')
    expect(obj['Role']).toBe('PIC')
  })

  it('maps MyFlightbook extended fields for solo, flight number, and crew', () => {
    const row = mapEntryToMyFlightbookRow(
      createTestEntry({
        role: 'Dual Received',
        flightNumber: '0002',
        flightTime: {
          total: 9.1,
          pic: 9.1,
          sic: null,
          dual: 9.1,
          solo: 9.1,
          night: 9.1,
          actualInstrument: 9.1,
          simulatedInstrument: 9.1,
          crossCountry: 9.1,
          dualGiven: 9.1,
        },
        trainingElements: 'Harry Potter',
        trainingInstructor: 'First Officer',
      })
    )
    const obj = buildHeaderRowObject(MYFLIGHTBOOK_HEADERS, row)
    expect(obj['Role']).toBe('Dual Received')
    expect(obj['Flight Number']).toBe('0002')
    expect(obj['Solo Time']).toBe('9.1')
    expect(obj['First Officer Name']).toBe('Harry Potter')
    expect(obj['Instructor Name']).toBe('')
    expect(obj['Name of SIC']).toBe('')
  })

  it('maps MyFlightbook crew job to the matching name column', () => {
    const row = mapEntryToMyFlightbookRow(
      createTestEntry({
        trainingElements: 'Abigail Hensley',
        trainingInstructor: 'Captain',
      })
    )
    const obj = buildHeaderRowObject(MYFLIGHTBOOK_HEADERS, row)
    expect(obj['Captain Name']).toBe('Abigail Hensley')
    expect(obj['First Officer Name']).toBe('')
  })

  it('falls back to Name of SIC when crew job is unknown', () => {
    const row = mapEntryToMyFlightbookRow(
      createTestEntry({
        trainingElements: 'Alex Pilot',
        trainingInstructor: '',
      })
    )
    const obj = buildHeaderRowObject(MYFLIGHTBOOK_HEADERS, row)
    expect(obj['Name of SIC']).toBe('Alex Pilot')
  })

  it('maps ForeFlight flight row', () => {
    const row = mapEntryToForeFlightFlightRow(createTestEntry())
    const obj = buildHeaderRowObject(FOREFLIGHT_FLIGHT_HEADERS, row)
    expect(obj['AircraftID']).toBe('N172P')
    expect(obj['TotalTime']).toBe('1.5')
  })

  it('maps LogTen flat keys', () => {
    const row = mapEntryToLogTenRow(createTestEntry())
    const obj = buildHeaderRowObject(LOGTEN_HEADERS, row)
    expect(obj.flight_flightDate).toBe('2024-06-13')
    expect(obj.aircraft_aircraftID).toBe('N172P')
  })

  it('exportToForeFlight includes aircraft and flights sections', () => {
    const result = exportToForeFlight([createTestEntry()])
    expect(result.content).toContain('AircraftID')
    expect(result.content).toContain('DayLandingsFullStop')
    expect(result.content).toContain('N172P')
  })

  it('exportToMyFlightbook includes UTF-8 BOM', () => {
    const result = exportToMyFlightbook([createTestEntry()])
    expect(result.bom).toBe(true)
    expect(result.content.startsWith('\uFEFF')).toBe(true)
  })
})

describe('logbookDataBridge ingest', () => {
  it('parses ForeFlight dual-section CSV with comma-blank hangar rows', () => {
    const csv = [
      'ForeFlight Logbook Import,Do not delete',
      ',,,,,,,,',
      'Aircraft Table,,,,,,,,',
      'AircraftID,Make,Model,aircraftClass (FAA)',
      'N172P,Cessna,172,airplane_single_engine_land',
      ',,,,,,,,',
      'N660DC,Diamond,DA-20-C1,airplane_single_engine_land',
      'Flights Table,,,,,,,,',
      'Date,AircraftID,From,To,TotalTime,PIC',
      '2024-06-13,N172P,KIND,KORD,1.5,1.5',
      '2023-08-12,N660DC,KSMD,KSMD,1.0,1.0',
    ].join('\n')

    const parsed = parseBridgeFile(csv)
    expect(parsed.source).toBe('foreflight')
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.aircraftRows?.some((r) => r.AircraftID === 'N660DC')).toBe(true)
    expect(parsed.rows[0]?.AircraftID).toBe('N172P')
  })

  it('parses ForeFlight dual-section CSV and imports flights only', () => {
    const csv = [
      'AircraftID,Make,Model',
      'N172P,Cessna,172',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,PilotComments',
      '2024-06-13,N172P,KIND,KORD,1.5,1.5,Test',
    ].join('\n')

    const result = ingestBridgeFile(csv)
    expect(result.source).toBe('foreflight')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.flightTime.total).toBe(1.5)
    expect(result.aircraftRowCount).toBe(1)
  })

  it('round-trips ForeFlight export through ingest', () => {
    const exported = exportToForeFlight([createTestEntry()])
    const ingested = ingestBridgeFile(exported.content)
    expect(ingested.entries).toHaveLength(1)
    expect(ingested.entries[0]?.registration).toBe('N172P')
    expect(ingested.entries[0]?.departure).toBe('KIND')
    expect(ingested.entries[0]?.destination).toBe('KORD')
  })

  it('parses LogTen Dynamic Export tab file with blank separator rows', () => {
    const tsv = [
      LOGTEN_DYNAMIC_HEADERS.join('\t'),
      [
        '2025-11-11',
        '4487',
        'N430YX',
        'E170',
        'KLGA',
        'KDCA',
        '1216',
        '',
        '',
        '1321',
        '1.08',
        'Derek Farmer',
        'WILLIAM RIDDLE',
        '1',
        '1;01;KDCA',
        '1.08',
        '1.08',
      ].join('\t'),
      [
        '2025-11-12',
        '4486',
        'N109HQ',
        'E170',
        'KSTL',
        'KLGA',
        '1255',
        '',
        '',
        '1519',
        '2.40',
        'Derek Farmer',
        'WILLIAM RIDDLE',
        '1',
        '1;22;KLGA',
        '2.40',
        '2.40',
      ].join('\t'),
      '',
      [
        '2025-11-13',
        '9999',
        'N999YX',
        'E170',
        'KORD',
        'KMDW',
        '0800',
        '',
        '',
        '0900',
        '1.0',
        'Derek Farmer',
        'OTHER PILOT',
        '',
        '',
        '1.0',
        '1.0',
      ].join('\t'),
    ].join('\n')

    const parsed = parseBridgeFile(tsv)
    expect(parsed.source).toBe('logten')
    expect(parsed.delimiter).toBe('\t')
    expect(parsed.rows).toHaveLength(3)
  })
})

describe('catalogAircraftFamilyKey', () => {
  it('keeps distinct Embraer make/model strings as separate catalog families', () => {
    expect(catalogAircraftFamilyKey('ERJ-170')).toBe('ERJ-170')
    expect(catalogAircraftFamilyKey('EMBRAER (Brazil) EMB-170/175')).toBe(
      'EMBRAER (Brazil) EMB-170/175'
    )
    expect(catalogAircraftFamilyKey('ERJ-170')).not.toBe(
      catalogAircraftFamilyKey('EMBRAER (Brazil) EMB-170/175')
    )
  })

  it('groups registration-only entries under Unknown aircraft', () => {
    expect(catalogAircraftFamilyKey('', 'N855RW')).toBe(UNKNOWN_AIRCRAFT_FAMILY)
    expect(catalogAircraftFamilyKey('Unknown', 'N855RW')).toBe(UNKNOWN_AIRCRAFT_FAMILY)
    expect(catalogAircraftFamilyKey('ERJ-170', 'N432YX')).toBe('ERJ-170')
  })
})
