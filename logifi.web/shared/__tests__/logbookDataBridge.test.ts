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
import type { LogEntry } from '../../app/utils/logbookTypes'

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
})
