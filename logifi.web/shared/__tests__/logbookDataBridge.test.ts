import { describe, it, expect } from 'vitest'
import {
  buildForeFlightRouteIntermediate,
  buildFullRoute,
  clockDurationTruncationWarning,
  detectImportDurationFormat,
  formatExportDate,
  formatRegistrationForExport,
  parseImportDate,
  parseImportBoolean,
  parseImportDuration,
} from '../logbookDataBridge/formatters'
import {
  FOREFLIGHT_FLIGHT_HEADERS,
  GENERIC_HEADERS,
  LOGIFI_NATIVE_HEADERS,
  LOGTEN_HEADERS,
  MYFLIGHTBOOK_HEADERS,
  mapEntryToForeFlightFlightRow,
  mapEntryToGenericRow,
  mapEntryToLogTenRow,
  mapEntryToLogifiNativeRow,
  mapEntryToMyFlightbookRow,
} from '../logbookDataBridge/exportMappers'
import {
  inferCategoryClassFromAircraftHints,
  mapRawRowToLogEntry,
  normalizeCategoryClassLabel,
} from '../logbookDataBridge/importMappers'
import {
  buildHeaderRowObject,
  exportToForeFlight,
  exportToGenericCSV,
  exportToLogifiNative,
  exportToLogTenPro,
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
import { applySimulatorImport, getSimTimeSum, readSimHintsFromRawRow } from '../../app/utils/importSimulator'
import { parseWithProvider } from '../import/ImporterFactory'
import {
  applyLogtenCrewFields,
  applyLogtenFileCrossCountry,
  inferImporterSeat,
} from '../../app/utils/logbookImportEnrichments'
import type { LogEntry } from '../../app/utils/logbookTypes'
import { getDisplayConditions } from '../../app/utils/flightConditions'
import { collectPilotCatalogNames } from '../looksLikePersonName'
import {
  catalogAircraftFamilyKey,
  UNKNOWN_AIRCRAFT_FAMILY,
} from '../catalogAircraftFamily'

const LOGTEN_NATIVE_SAMPLE_ROW = {
  flight_flightDate: '2025-11-11',
  flight_flightNumber: '4487',
  flight_from: 'KLGA',
  flight_to: 'KDCA',
  flight_selectedCrewPIC: 'Jane Example',
  flight_selectedCrewSIC: 'Alex Pilot',
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
  flight_selectedCrewPIC: 'Jane Example',
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
  'PIC/P1 Crew': 'Jane Example',
  'SIC/P2 Crew': 'Alex Pilot',
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

describe('parseImportDuration', () => {
  it('parses H:MM, H+MM, and decimals, and rejects minutes over 59', () => {
    expect(parseImportDuration('0:48')).toBe(0.8)
    expect(parseImportDuration('1:17')).toBe(1.3)
    expect(parseImportDuration('1:18')).toBe(1.3)
    expect(parseImportDuration('1.25')).toBe(1.3)
    expect(parseImportDuration('12:05')).toBe(12.1)
    expect(parseImportDuration('1+30')).toBe(1.5)
    expect(parseImportDuration('0.8')).toBe(0.8)
    expect(parseImportDuration('.5')).toBe(0.5)
    expect(parseImportDuration('.8')).toBe(0.8)
    expect(parseImportDuration('1.')).toBe(1)
    expect(parseImportDuration(' 1 : 17 ')).toBe(1.3)
    expect(parseImportDuration('')).toBeNull()
    expect(parseImportDuration('   ')).toBeNull()
    expect(parseImportDuration('1:60')).toBeNull()
    expect(parseImportDuration(null)).toBeNull()
    expect(parseImportDuration('1,5')).toBe(1.5)
    expect(parseImportDuration('0,8')).toBe(0.8)
  })
})

describe('parseImportBoolean', () => {
  it('parses Yes/No and does not treat No as true', () => {
    expect(parseImportBoolean('Yes')).toBe(true)
    expect(parseImportBoolean('No')).toBe(false)
    expect(parseImportBoolean('true')).toBe(true)
    expect(parseImportBoolean('false')).toBe(false)
    expect(parseImportBoolean('local')).toBe(false)
    expect(parseImportBoolean('zulu')).toBe(true)
    expect(parseImportBoolean('')).toBeNull()
    expect(parseImportBoolean(undefined)).toBeNull()
    expect(parseImportBoolean(true)).toBe(true)
    expect(parseImportBoolean(false)).toBe(false)
  })
})

describe('category class inference', () => {
  it('maps jet and airliner type codes to AMEL and leaves unknown types blank', () => {
    expect(inferCategoryClassFromAircraftHints('E170', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('E175', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('E75L', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('E190', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('ERJ-175', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('', 'EMB-175')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('', 'Embraer 190')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('CRJ-900', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('CL-65', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('B737', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('A320', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('DC-9', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('MD-88', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('DA42', '')).toBe('AMEL')
    expect(inferCategoryClassFromAircraftHints('R22', '')).toBe('HELI')
    expect(inferCategoryClassFromAircraftHints('', '')).toBe('')
    expect(inferCategoryClassFromAircraftHints('Lancair', '')).toBe('')
  })

  it('maps common single-engine trainers to ASEL', () => {
    for (const hint of ['C172', 'C152', 'C150', 'C-172', 'PA-28', 'PA28', 'SR22', 'SR20', 'DA40', 'DA20']) {
      expect(inferCategoryClassFromAircraftHints(hint, '')).toBe('ASEL')
    }
    expect(inferCategoryClassFromAircraftHints('', 'Bonanza')).toBe('ASEL')
    expect(inferCategoryClassFromAircraftHints('', 'Cessna 172S')).toBe('ASEL')
    expect(inferCategoryClassFromAircraftHints('', 'PA-28-181')).toBe('ASEL')
    expect(inferCategoryClassFromAircraftHints('DA42', '')).toBe('AMEL')
  })

  it('does not leave a C172 with a blank class failing category validation', () => {
    const entry = mapRawRowToLogEntry({
      Date: '2024-06-13',
      'Aircraft ID': 'N172SP',
      'Aircraft Make/Model': 'C172',
      From: 'KIND',
      To: 'KORD',
      'Total Time': '1.2',
      PIC: '1.2',
    })
    expect(entry?.aircraftCategoryClass).toBe('ASEL')
    const categoryErrors = validatePart61RequiredFields(entry!).filter(
      (result) => result.field === 'aircraftCategoryClass'
    )
    expect(categoryErrors).toHaveLength(0)
  })
})

describe('import duration preview warning', () => {
  it('warns only when H:MM cells survive as whole hours', () => {
    const rows = [{ flight_totalTime: '0:48', flight_pic: '1:17', Out: '12:16' }]
    expect(detectImportDurationFormat(rows)).toBe('h:mm')
    expect(clockDurationTruncationWarning(rows, [0.8, 1.3])).toBeNull()
    expect(clockDurationTruncationWarning(rows, [0, 1])).toMatch(/whole number/i)
    expect(clockDurationTruncationWarning([{ Out: '12:16', flight_totalTime: '1.5' }], [1.5])).toBeNull()
    expect(detectImportDurationFormat([{ flight_totalTime: '1.5' }])).toBe('decimal')
  })
})

describe('logbookDataBridge formatters', () => {
  it('prepends N to US bare tail numbers', () => {
    expect(formatRegistrationForExport('172P')).toBe('N172P')
    expect(formatRegistrationForExport('N172P')).toBe('N172P')
    expect(formatRegistrationForExport('#123456')).toBe('#123456')
  })

  it('formats and parses dates per platform', () => {
    expect(formatExportDate('2024-06-13', 'iso')).toBe('2024-06-13')
    expect(formatExportDate('2024-06-13', 'mdy')).toBe('06/13/2024')
    expect(parseImportDate('6/13/2024')).toBe('2024-06-13')
    expect(parseImportDate('15/04/2026')).toBe('2026-04-15')
    expect(parseImportDate('2026-02-30')).toBeNull()
    expect(parseImportDate('2026-15-04')).toBeNull()
    expect(parseImportDate('Nov 14, 2026')).toBe('2026-11-14')
    expect(parseImportDate('4/5/26')).toBe('2026-04-05')
  })

  it('keeps the written calendar day for ISO timestamps with a zone', () => {
    expect(parseImportDate('2026-08-29T00:00:00.000Z')).toBe('2026-08-29')
    expect(parseImportDate('2026-08-29T23:30:00-05:00')).toBe('2026-08-29')
    expect(parseImportDate('2024-06-13 14:30')).toBe('2024-06-13')
    expect(parseImportDate('2026-15-04T00:00:00Z')).toBeNull()
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

  it('does not treat generic Date / Registration / Total Time as ForeFlight', () => {
    expect(detectBridgeSource(['Date', 'Registration', 'Total Time'])).not.toBe('foreflight')
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
    enrichLogtenDynamicExportRow(entry!, LOGTEN_DYNAMIC_SAMPLE_ROW, 'Jane Example')
    applyLogtenDynamicRoleAndTime(entry!, LOGTEN_DYNAMIC_SAMPLE_ROW, 'Jane Example')

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
    enrichLogtenDynamicExportRow(entry!, row, 'Jane Example')
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
    expect(namesMatchFlexible('Jane Example', 'JANE EXAMPLE')).toBe(true)
    expect(namesMatchFlexible('Jane Example', 'Example, Jane')).toBe(false)
    expect(namesMatchFlexible('J Example', 'Jane Example')).toBe(true)
    expect(namesMatchFlexible('Jane', 'Jane Example')).toBe(true)
    expect(namesMatchFlexible('Jane Example', 'Jane')).toBe(true)
  })

  it('parses LogTen Approach 1 semicolon format', () => {
    expect(parseLogtenApproach1('1;01;KDCA')).toEqual({ count: 1, type: '01' })
    expect(parseLogtenApproach1('1;30R;KSTL')).toEqual({ count: 1, type: '30R' })
    expect(parseLogtenApproach1('')).toBeNull()
  })

  it('keeps LogTen H:MM durations and reads a blank-make E170 as AMEL', () => {
    const row = {
      flight_flightDate: '2025-11-11',
      flight_from: 'KLGA',
      flight_to: 'KDCA',
      aircraft_aircraftID: 'A16',
      aircraftType_type: 'E170',
      aircraftType_make: '',
      aircraftType_model: '',
      flight_totalTime: '0:48',
      flight_pic: '1:17',
      flight_sic: '12:05',
      flight_night: '0:48',
      flight_simulator: '1:17',
      flight_dayLandings: '1',
    }
    const entry = mapRawRowToLogEntry(row, { source: 'logten' })
    expect(entry).not.toBeNull()
    expect(entry?.registration).toBe('A16')
    expect(entry?.aircraftMakeModel).toBe('E170')
    expect(entry?.aircraftCategoryClass).toBe('AMEL')
    expect(entry?.flightTime.total).toBe(0.8)
    expect(entry?.flightTime.pic).toBe(1.3)
    expect(entry?.flightTime.sic).toBe(12.1)
    expect(entry?.flightTime.night).toBe(0.8)
    expect(entry?.performance.dayLandings).toBe(1)
  })

  it('reads LogTen type from aircraft_aircraftType and flight_selectedAircraftType', () => {
    const fromAircraftType = mapRawRowToLogEntry(
      {
        flight_flightDate: '2025-11-11',
        flight_from: 'KLGA',
        flight_to: 'KDCA',
        aircraft_aircraftID: 'A37',
        aircraft_aircraftType: 'E175',
        flight_totalTime: '1:00',
      },
      { source: 'logten' }
    )
    expect(fromAircraftType?.aircraftMakeModel).toBe('E175')
    expect(fromAircraftType?.aircraftCategoryClass).toBe('AMEL')

    const fromExportKey = mapRawRowToLogEntry(
      {
        date: '2025-11-12',
        flight_selectedAircraftID: 'N430YX',
        flight_selectedAircraftType: 'E190',
        flight_totalTime: '0:48',
      },
      { source: 'logten' }
    )
    expect(fromExportKey?.registration).toBe('N430YX')
    expect(fromExportKey?.aircraftMakeModel).toBe('E190')
    expect(fromExportKey?.flightTime.total).toBe(0.8)
  })

  it('parses native JSON flightTime H:MM strings', () => {
    const entry = mapRawRowToLogEntry({
      date: '2024-06-13',
      registration: 'N172SP',
      departure: 'KIND',
      destination: 'KORD',
      flightTime: { total: '0:48', pic: '0:48' },
    })
    expect(entry?.flightTime.total).toBe(0.8)
    expect(entry?.flightTime.pic).toBe(0.8)
  })

  it('maps LogTen native export row with flight_pic and approach', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SAMPLE_ROW, { source: 'logten' })
    expect(entry?.date).toBe('2025-11-11')
    expect(entry?.registration).toBe('N430YX')
    expect(entry?.flightNumber).toBe('4487')
    expect(entry?.role).toBe('PIC')
    expect(entry?.picName).toBe('Jane Example')
    expect(entry?.sicName).toBe('Alex Pilot')
    expect(entry?.flightTime.pic).toBe(1.1)
    expect(entry?.flightTime.total).toBeNull()
    expect(entry?.aircraftCategoryClass).toBe('AMEL')
    expect(entry?.performance.approaches).toEqual([{ type: '01', count: 1 }])
  })

  it('assigns other crew member for LogTen native PIC import', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SAMPLE_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, LOGTEN_NATIVE_SAMPLE_ROW, 'Jane Example')

    expect(entry?.trainingElements).toBe('Alex Pilot')
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
      'Jane Example',
      'Ron Weasley',
      'Test Test'
    )
    expect(seat).toBe('SIC')
  })

  it('assigns Ron Weasley as Captain for SIC-only time row with non-matching profile', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SIC_TIME_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, LOGTEN_NATIVE_SIC_TIME_ROW, 'Test Test')

    expect(entry?.trainingElements).toBe('Jane Example')
    expect(entry?.trainingInstructor).toBe('Captain')
    expect(entry?.role).toBe('SIC')
  })

  it('assigns Ron Weasley as Captain when profile is in PIC column but SIC time logged', () => {
    const entry = mapRawRowToLogEntry(LOGTEN_NATIVE_SIC_TIME_ROW, { source: 'logten' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, LOGTEN_NATIVE_SIC_TIME_ROW, 'Jane Example')

    expect(entry?.trainingElements).toBe('Ron Weasley')
    expect(entry?.trainingInstructor).toBe('Captain')
    expect(entry?.role).toBe('SIC')
  })
})

describe('logbookDataBridge export', () => {
  it('maps MyFlightbook row with exact headers', () => {
    const row = mapEntryToMyFlightbookRow(createTestEntry())
    const obj = buildHeaderRowObject(MYFLIGHTBOOK_HEADERS, row)
    expect(obj['Date']).toBe('06/13/2024')
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

  it('carries logged takeoffs through ForeFlight and LogTen export and re-import', () => {
    const logged = createTestEntry()
    logged.performance = { ...logged.performance, dayTakeoffs: 2, nightTakeoffs: 1, dayLandings: 3, nightLandings: 1 }

    const ff = buildHeaderRowObject(FOREFLIGHT_FLIGHT_HEADERS, mapEntryToForeFlightFlightRow(logged))
    expect([ff['DayTakeoffs'], ff['NightTakeoffs']]).toEqual(['2', '1'])
    const ffBack = mapRawRowToLogEntry(ff, { source: 'foreflight' })
    expect([ffBack?.performance.dayTakeoffs, ffBack?.performance.nightTakeoffs]).toEqual([2, 1])

    const lt = buildHeaderRowObject(LOGTEN_HEADERS, mapEntryToLogTenRow(logged))
    expect([lt.flight_dayTakeoffs, lt.flight_nightTakeoffs]).toEqual(['2', '1'])
    const ltBack = mapRawRowToLogEntry(lt, { source: 'logten' })
    expect([ltBack?.performance.dayTakeoffs, ltBack?.performance.nightTakeoffs]).toEqual([2, 1])
  })

  it('leaves takeoffs blank on export when they were not logged', () => {
    const notLogged = createTestEntry()
    notLogged.performance = { ...notLogged.performance, dayTakeoffs: null, nightTakeoffs: null, dayLandings: 3 }

    const ff = buildHeaderRowObject(FOREFLIGHT_FLIGHT_HEADERS, mapEntryToForeFlightFlightRow(notLogged))
    expect(ff['DayTakeoffs']).toBe('')
    expect(mapRawRowToLogEntry(ff, { source: 'foreflight' })?.performance.dayTakeoffs).toBeNull()

    const lt = buildHeaderRowObject(LOGTEN_HEADERS, mapEntryToLogTenRow(notLogged))
    expect(lt.flight_dayTakeoffs).toBe('')
    expect(mapRawRowToLogEntry(lt, { source: 'logten' })?.performance.dayTakeoffs).toBeNull()
  })

  it('does not add takeoff columns to formats that have none', () => {
    expect(MYFLIGHTBOOK_HEADERS.some((h) => /takeoff|t\/o/i.test(h))).toBe(false)
    expect(GENERIC_HEADERS.some((h) => /takeoff|t\/o/i.test(h))).toBe(false)
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

  function createMixedSimEntry(): LogEntry {
    return createTestEntry({
      role: 'PIC',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E170',
      registration: 'N430YX',
      departure: 'KLGA',
      destination: 'KDCA',
      flightTime: {
        total: 0.8,
        pic: 0.8,
        sic: null,
        dual: 0.4,
        solo: 0.2,
        night: null,
        actualInstrument: 0.5,
        simulatedInstrument: 0.3,
        crossCountry: null,
        dualGiven: 0.6,
        ftd: 1.3,
      },
    })
  }

  it('writes simulator and dropped time columns for each CSV', () => {
    const entry = createMixedSimEntry()
    expect(mapEntryToForeFlightFlightRow(entry)).toHaveLength(FOREFLIGHT_FLIGHT_HEADERS.length)
    expect(mapEntryToMyFlightbookRow(entry)).toHaveLength(MYFLIGHTBOOK_HEADERS.length)
    expect(mapEntryToLogTenRow(entry)).toHaveLength(LOGTEN_HEADERS.length)
    expect(mapEntryToGenericRow(entry)).toHaveLength(GENERIC_HEADERS.length)
    expect(mapEntryToLogifiNativeRow(entry)).toHaveLength(LOGIFI_NATIVE_HEADERS.length)

    const foreflight = buildHeaderRowObject(
      FOREFLIGHT_FLIGHT_HEADERS,
      mapEntryToForeFlightFlightRow(entry)
    )
    expect(foreflight.TotalTime).toBe('0.8')
    expect(foreflight.SimulatedFlight).toBe('1.3')
    expect(foreflight.ActualInstrument).toBe('0.5')
    expect(foreflight.SimulatedInstrument).toBe('0.3')
    expect(foreflight.DualReceived).toBe('0.4')
    expect(foreflight.DualGiven).toBe('0.6')
    expect(foreflight.Solo).toBe('0.2')
    expect(foreflight.AircraftID).toBe('N430YX')

    const myflightbook = buildHeaderRowObject(
      MYFLIGHTBOOK_HEADERS,
      mapEntryToMyFlightbookRow(entry)
    )
    expect(myflightbook['Total Flight Time']).toBe('0.8')
    expect(myflightbook['Ground Simulator']).toBe('1.3')
    expect(myflightbook.IMC).toBe('0.5')
    expect(myflightbook['Simulated Instrument']).toBe('0.3')
    expect(myflightbook['Dual Received']).toBe('0.4')
    expect(myflightbook.CFI).toBe('0.6')
    expect(myflightbook['Solo Time']).toBe('0.2')
    expect(myflightbook.Model).toBe('E170')

    const logten = buildHeaderRowObject(LOGTEN_HEADERS, mapEntryToLogTenRow(entry))
    expect(logten.flight_totalTime).toBe('0.8')
    expect(logten.flight_simulator).toBe('1.3')
    expect(logten.flight_actualInstrument).toBe('0.5')
    expect(logten.flight_simulatedInstrument).toBe('0.3')
    expect(logten.flight_dualReceived).toBe('0.4')
    expect(logten.flight_dualGiven).toBe('0.6')
    expect(logten.flight_solo).toBe('0.2')
    expect(logten.aircraftType_model).toBe('E170')
    expect(logten.aircraftType_selectedAircraftClass).toBe('AMEL')

    const generic = buildHeaderRowObject(GENERIC_HEADERS, mapEntryToGenericRow(entry))
    expect(generic['Total Time']).toBe('0.8')
    expect(generic['Simulator Time']).toBe('1.3')
    expect(generic['Actual Instrument']).toBe('0.5')
    expect(generic['Simulated Instrument']).toBe('0.3')
    expect(generic['Category/Class']).toBe('AMEL')
    expect(generic['Aircraft Make/Model']).toBe('E170')

    const logifi = buildHeaderRowObject(LOGIFI_NATIVE_HEADERS, mapEntryToLogifiNativeRow(entry))
    expect(logifi['Total Flight Time']).toBe('0.8')
    expect(logifi['Ground Simulator']).toBe('1.3')
    expect(logifi.FTD).toBe('1.3')
    expect(logifi.FFS).toBe('')
    expect(logifi.ATD).toBe('')
    expect(logifi['Actual Instrument']).toBe('0.5')
    expect(logifi['Simulated Instrument']).toBe('0.3')
    expect(logifi['Dual Received']).toBe('0.4')
    expect(logifi['Dual Given']).toBe('0.6')
    expect(logifi.Solo).toBe('0.2')
    expect(logifi['Aircraft Category/Class']).toBe('AMEL')
    expect(logifi['Aircraft Make/Model']).toBe('E170')
  })

  it('keeps a sim-only session out of ForeFlight and MyFlightbook total time', () => {
    const copied = createTestEntry({
      logbookType: 'simulator',
      flightTime: {
        total: 1.3,
        pic: 1.3,
        sic: null,
        dual: null,
        solo: null,
        night: null,
        actualInstrument: null,
        simulatedInstrument: null,
        crossCountry: null,
        dualGiven: null,
        ftd: 1.3,
      },
    })
    const legacy = createTestEntry({
      logbookType: 'simulator',
      flightTime: {
        total: 1.3,
        pic: null,
        sic: null,
        dual: null,
        solo: null,
        night: null,
        actualInstrument: null,
        simulatedInstrument: null,
        crossCountry: null,
        dualGiven: null,
      },
    })

    for (const entry of [copied, legacy]) {
      const foreflight = buildHeaderRowObject(
        FOREFLIGHT_FLIGHT_HEADERS,
        mapEntryToForeFlightFlightRow(entry)
      )
      expect(foreflight.TotalTime).toBe('')
      expect(foreflight.SimulatedFlight).toBe('1.3')

      const myflightbook = buildHeaderRowObject(
        MYFLIGHTBOOK_HEADERS,
        mapEntryToMyFlightbookRow(entry)
      )
      expect(myflightbook['Total Flight Time']).toBe('')
      expect(myflightbook['Ground Simulator']).toBe('1.3')
    }
  })

  it('round-trips Logifi CSV simulator and time fields', () => {
    const original = createMixedSimEntry()
    const exported = exportToLogifiNative([original], { baseDate: '2024-06-13' })
    const parsed = parseBridgeFile(exported.content, 'logifi-native')
    expect(parsed.rows).toHaveLength(1)

    const row = parsed.rows[0]!
    const entry = mapRawRowToLogEntry(row, { source: 'logifi-native' })
    expect(entry).not.toBeNull()
    applySimulatorImport(entry!, readSimHintsFromRawRow(row))

    expect(entry!.flightTime.total).toBe(0.8)
    expect(entry!.flightTime.ftd).toBe(1.3)
    expect(getSimTimeSum(entry!)).toBe(1.3)
    expect(entry!.flightTime.actualInstrument).toBe(0.5)
    expect(entry!.flightTime.simulatedInstrument).toBe(0.3)
    expect(entry!.flightTime.dual).toBe(0.4)
    expect(entry!.flightTime.dualGiven).toBe(0.6)
    expect(entry!.flightTime.solo).toBe(0.2)
    expect(entry!.aircraftCategoryClass).toBe('AMEL')
    expect(entry!.aircraftMakeModel).toBe('E170')
    expect(entry!.logbookType).toBe('flight')
  })

  it('round-trips LogTen CSV simulator and time fields', () => {
    const original = createMixedSimEntry()
    const exported = exportToLogTenPro([original], { baseDate: '2024-06-13' })
    const result = parseWithProvider('logten', exported.content)
    const entry = result.entries[0]!

    expect(entry.flightTime.total).toBe(0.8)
    expect(getSimTimeSum(entry)).toBe(1.3)
    expect(entry.flightTime.actualInstrument).toBe(0.5)
    expect(entry.flightTime.simulatedInstrument).toBe(0.3)
    expect(entry.flightTime.dual).toBe(0.4)
    expect(entry.flightTime.dualGiven).toBe(0.6)
    expect(entry.flightTime.solo).toBe(0.2)
    expect(entry.aircraftCategoryClass).toBe('AMEL')
    expect(entry.aircraftMakeModel).toBe('E170')
    expect(entry.logbookType).toBe('flight')
  })

  it('leaves generic simulator and instrument columns on the export', () => {
    const exported = exportToGenericCSV([createMixedSimEntry()], { baseDate: '2024-06-13' })
    expect(exported.content).toContain('Simulator Time')
    expect(exported.content).toContain('Actual Instrument')
    expect(exported.content).toContain('Simulated Instrument')
    expect(exported.content).toContain('1.3')
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
        'Jane Example',
        'Alex Pilot',
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
        'Jane Example',
        'Alex Pilot',
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
        'Jane Example',
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

describe('PIC Name / SIC Name import and native export', () => {
  const crewBaseRow = {
    Date: '2024-06-13',
    Registration: 'N12345',
    From: 'KORD',
    To: 'KMDW',
    'Aircraft Make/Model': 'B777',
    'Category/Class': 'AMEL',
    'Total Time': '1.5',
  }

  it('maps PIC Name / SIC Name columns onto picName/sicName', () => {
    const entry = mapRawRowToLogEntry({
      ...crewBaseRow,
      PIC: '1.5',
      'PIC Name': 'D. Cameron',
      'SIC Name': 'D. Bird',
    })
    expect(entry?.picName).toBe('D. Cameron')
    expect(entry?.sicName).toBe('D. Bird')
    expect(entry?.flightTime.pic).toBe(1.5)
    expect(entry?.flightTime.sic).toBeNull()
  })

  it('maps Captain / First Officer columns', () => {
    const entry = mapRawRowToLogEntry({
      ...crewBaseRow,
      Captain: 'Jane CA',
      'First Officer': 'John FO',
    })
    expect(entry?.picName).toBe('Jane CA')
    expect(entry?.sicName).toBe('John FO')
  })

  it('parses 777-style PIC/SIC remarks and ignores IRP/ACM names', () => {
    const entry = mapRawRowToLogEntry({
      ...crewBaseRow,
      Remarks: 'PIC D. Cameron SIC D. Bird (TOLA) IRP 1 X.DeCoteau',
    })
    expect(entry?.picName).toBe('D. Cameron')
    expect(entry?.sicName).toBe('D. Bird')
    expect(entry?.picName).not.toContain('DeCoteau')
    expect(entry?.sicName).not.toContain('DeCoteau')
    expect(entry?.flightTime.pic).toBeNull()
    expect(entry?.flightTime.sic).toBeNull()
    expect(entry?.role).toBe('')
  })

  it('does not overwrite explicit columns with remarks', () => {
    const entry = mapRawRowToLogEntry({
      ...crewBaseRow,
      'PIC Name': 'Explicit PIC',
      'SIC Name': 'Explicit SIC',
      Remarks: 'PIC A. Other SIC B. Other IRP 1 X.DeCoteau',
    })
    expect(entry?.picName).toBe('Explicit PIC')
    expect(entry?.sicName).toBe('Explicit SIC')
  })

  it('treats E-175 remarks name + employee number as the other crew', () => {
    const entry = mapRawRowToLogEntry({
      ...crewBaseRow,
      Role: 'PIC',
      PIC: '1.5',
      Remarks: 'Ary Madison 53346',
    })
    expect(entry?.role).toBe('PIC')
    expect(entry?.picName).toBeNull()
    expect(entry?.sicName).toBe('Ary Madison')
    expect(entry?.trainingElements).toBe('Ary Madison')
    expect(entry?.trainingInstructor).toBe('First Officer')
    expect(entry?.flightTime.pic).toBe(1.5)
    expect(entry?.flightTime.sic).toBeNull()
    expect(entry?.flightTime.total).toBe(1.5)
  })

  it('fills Job and Pilot name from E-175 remarks with synthetic name and employee number', () => {
    const row = {
      ...crewBaseRow,
      Role: 'PIC',
      PIC: '1.5',
      Remarks: 'Jane Example 900001',
    }
    const entry = mapRawRowToLogEntry(row)
    expect(entry?.sicName).toBe('Jane Example')
    expect(entry?.trainingElements).toBe('Jane Example')
    expect(entry?.trainingInstructor).toBe('First Officer')

    applyLogtenCrewFields(entry!, row, 'Someone Else')
    expect(entry?.trainingElements).toBe('Jane Example')
    expect(entry?.trainingInstructor).toBe('First Officer')
    expect(entry?.flightTime.pic).toBe(1.5)
  })

  it('treats E-175 remarks as PIC name when Role is SIC', () => {
    const entry = mapRawRowToLogEntry({
      ...crewBaseRow,
      Role: 'SIC',
      SIC: '1.5',
      Remarks: 'Jane Doe 12345',
    })
    expect(entry?.role).toBe('SIC')
    expect(entry?.picName).toBe('Jane Doe')
    expect(entry?.sicName).toBeNull()
    expect(entry?.trainingElements).toBe('Jane Doe')
    expect(entry?.trainingInstructor).toBe('Captain')
    expect(entry?.flightTime.sic).toBe(1.5)
    expect(entry?.flightTime.pic).toBeNull()
  })

  it('does not invent PIC/SIC hours from names; Part 61 still fails without hours', () => {
    const named = mapRawRowToLogEntry({
      ...crewBaseRow,
      Remarks: 'PIC D. Cameron SIC D. Bird (TOLA) IRP 1 X.DeCoteau',
    })
    const unnamed = mapRawRowToLogEntry({
      ...crewBaseRow,
      Remarks: 'Observer / IRP',
    })
    expect(named?.flightTime.pic).toBe(unnamed?.flightTime.pic)
    expect(named?.flightTime.sic).toBe(unnamed?.flightTime.sic)
    expect(named?.role).toBe(unnamed?.role)

    const namedErrors = validatePart61RequiredFields(named!).filter((r) => r.type === 'error')
    const unnamedErrors = validatePart61RequiredFields(unnamed!).filter((r) => r.type === 'error')
    expect(namedErrors.map((e) => e.field).sort()).toEqual(unnamedErrors.map((e) => e.field).sort())
    expect(namedErrors.some((e) => e.field === 'pic')).toBe(true)
  })

  it('writes PIC Name / SIC Name on native export and round-trips', () => {
    const original = createTestEntry({
      picName: 'D. Cameron',
      sicName: 'D. Bird',
    })
    const row = mapEntryToLogifiNativeRow(original)
    expect(row).toHaveLength(LOGIFI_NATIVE_HEADERS.length)
    const obj = buildHeaderRowObject(LOGIFI_NATIVE_HEADERS, row)
    expect(obj['PIC Name']).toBe('D. Cameron')
    expect(obj['SIC Name']).toBe('D. Bird')

    const exported = exportToLogifiNative([original], { baseDate: '2024-06-13' })
    expect(exported.content).toContain('PIC Name')
    expect(exported.content).toContain('SIC Name')
    expect(exported.content).toContain('D. Cameron')
    expect(exported.content).toContain('D. Bird')

    const reimported = mapRawRowToLogEntry(obj)
    expect(reimported?.picName).toBe('D. Cameron')
    expect(reimported?.sicName).toBe('D. Bird')
    expect(reimported?.flightTime.pic).toBe(1.5)
  })
})

describe('Logifi-native lesson text vs crew catalog', () => {
  const dualHoodWorkRow = {
    Date: '2024-06-13',
    Role: 'Dual Received',
    'PIC Name': 'Harvey Dent',
    'SIC Name': 'James Gordon',
    'Aircraft Make/Model': 'C-172',
    Registration: 'N172GC',
    Departure: 'KOSH',
    Destination: 'KORD',
    'Training Elements': 'Hood work',
    'Flight Conditions': 'IFR;VFR;Cross-Country',
    'Dual Received': '1.2',
    'Cross Country': '1.2',
    'Total Flight Time': '1.2',
  }

  function snapshotSavedFields(entry: LogEntry) {
    return {
      date: entry.date,
      role: entry.role,
      picName: entry.picName,
      sicName: entry.sicName,
      aircraftMakeModel: entry.aircraftMakeModel,
      registration: entry.registration,
      trainingElements: entry.trainingElements,
      trainingInstructor: entry.trainingInstructor,
      flightConditions: [...(entry.flightConditions || [])],
      dual: entry.flightTime.dual,
      crossCountry: entry.flightTime.crossCountry,
      total: entry.flightTime.total,
    }
  }

  it('does not catalog Hood work, hides VFR, and round-trips other fields', () => {
    const entry = mapRawRowToLogEntry(dualHoodWorkRow, { source: 'logifi-native' })
    expect(entry).not.toBeNull()
    applyLogtenCrewFields(entry!, dualHoodWorkRow, 'Harvey Dent')
    entry!.flightConditions = String(dualHoodWorkRow['Flight Conditions'])
      .split(';')
      .map((token) => token.trim())
      .filter(Boolean)

    expect(entry!.trainingElements).not.toBe('Hood work')
    const catalog = collectPilotCatalogNames(entry!)
    expect(catalog).toContain('Harvey Dent')
    expect(catalog).toContain('James Gordon')
    expect(catalog.some((name) => name.toLowerCase().includes('hood'))).toBe(false)

    expect(getDisplayConditions(entry!)).toEqual(['IFR', 'Cross-Country'])
    expect(entry!.flightConditions).toEqual(['IFR', 'VFR', 'Cross-Country'])

    const saved = snapshotSavedFields(entry!)
    const exported = buildHeaderRowObject(LOGIFI_NATIVE_HEADERS, mapEntryToLogifiNativeRow(entry!))
    const reimported = mapRawRowToLogEntry(exported, { source: 'logifi-native' })
    expect(reimported).not.toBeNull()
    applyLogtenCrewFields(reimported!, exported, 'Harvey Dent')
    reimported!.flightConditions = String(exported['Flight Conditions'] || '')
      .split(';')
      .map((token) => token.trim())
      .filter(Boolean)

    expect(snapshotSavedFields(reimported!)).toEqual(saved)
  })

  it('keeps the exported Role on a native round trip even when PIC time is logged', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        Role: 'Instructor',
        Registration: 'N172GC',
        'Aircraft Make/Model': 'C-172',
        'Total Flight Time': '1.5',
        PIC: '1.5',
        'Dual Given': '1.5',
      },
      { source: 'logifi-native' }
    )
    expect(entry?.role).toBe('Instructor')
  })

  it('still copies Training Elements when it is a person name', () => {
    const entry = mapRawRowToLogEntry(
      {
        ...dualHoodWorkRow,
        'Training Elements': 'Harvey Dent',
      },
      { source: 'logifi-native' }
    )
    expect(entry?.trainingElements).toBe('Harvey Dent')
  })

  it('keeps lesson Training Elements when the row has no PIC/SIC name', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2024-06-13',
        Registration: 'N172GC',
        'Aircraft Make/Model': 'C-172',
        Departure: 'KOSH',
        Destination: 'KORD',
        'Training Elements': 'Hood work',
        'Dual Received': '1.2',
      },
      { source: 'logifi-native' }
    )
    expect(entry?.trainingElements).toBe('Hood work')
  })
})

describe('import integrity regressions', () => {
  const picRow = {
    Date: '2026-04-15',
    Registration: 'N172FX',
    From: 'KOSH',
    To: 'KOSH',
    PIC: '1.2',
    'Total Time': '1.2',
  }

  it('does not treat remarks lesson text as the other crew member', () => {
    for (const remarks of ['Pattern work', 'Touch and goes', 'XC nav']) {
      const entry = mapRawRowToLogEntry({ ...picRow, Remarks: remarks })
      expect(entry?.remarks).toBe(remarks)
      expect(entry?.sicName).toBeNull()
      expect(entry?.picName).toBeNull()
      expect(entry?.trainingElements).toBe('')
      expect(entry?.trainingInstructor).toBe('')
    }
  })

  it('keeps file XC when total is larger', () => {
    const entry = mapRawRowToLogEntry({
      flight_flightDate: '2026-04-15',
      aircraft_aircraftID: 'N430YX',
      flight_from: 'KLGA',
      flight_to: 'KDCA',
      flight_totalTime: '1.6',
      flight_crossCountry: '1.2',
      flight_pic: '1.6',
    })
    expect(entry?.flightTime.total).toBe(1.6)
    expect(entry?.flightTime.crossCountry).toBe(1.2)

    entry!.flightTime.total = 1.6
    applyLogtenFileCrossCountry(entry!, '1.2')
    expect(entry?.flightTime.crossCountry).toBe(1.2)
    expect(entry?.flightTime.total).toBe(1.6)
  })

  it('maps ForeFlight AllLandings minus night, not full-stop day', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2026-04-15',
        AircraftID: 'N172FX',
        From: 'KOSH',
        To: 'KOSH',
        TotalTime: '1.2',
        PIC: '1.2',
        AllLandings: '5',
        DayLandingsFullStop: '1',
        NightLandingsFullStop: '0',
      },
      { source: 'foreflight' }
    )
    expect(entry?.performance.dayLandings).toBe(5)
    expect(entry?.performance.nightLandings).toBe(0)
  })

  it('maps MyFlightbook Landings minus FS Night, not FS Day', () => {
    const entry = mapRawRowToLogEntry(
      {
        Date: '2026-04-15',
        'Tail Number': 'N172MB',
        Model: 'C-172',
        'Total Flight Time': '1.1',
        PIC: '1.1',
        Route: 'KOSH KOSH',
        Landings: '4',
        'FS Day Landings': '1',
        'FS Night Landings': '0',
      },
      { source: 'myflightbook' }
    )
    expect(entry?.performance.dayLandings).toBe(4)
    expect(entry?.performance.nightLandings).toBe(0)
  })

  it('maps glider, balloon, powered-lift, and gyroplane to canonical classes', () => {
    expect(normalizeCategoryClassLabel('glider')).toBe('GLID')
    expect(normalizeCategoryClassLabel('lighter_than_air_balloon')).toBe('BAL')
    expect(normalizeCategoryClassLabel('powered_lift')).toBe('PL')
    expect(normalizeCategoryClassLabel('rotorcraft_gyroplane')).toBe('GYRO')
    expect(normalizeCategoryClassLabel('rotorcraft_helicopter')).toBe('HELI')
  })

  it('preserves LogTen crew capitalization and existing job labels', () => {
    const entry = mapRawRowToLogEntry({
      Date: '2026-04-15',
      Registration: 'N172FX',
      From: 'KOSH',
      To: 'KORD',
      PIC: '1.5',
      'Total Time': '1.5',
      'PIC Name': 'Pat McDonald',
      'SIC Name': 'Sam DeLuca',
      'Training Instructor': 'First Officer',
    })
    expect(entry?.trainingInstructor).toBe('First Officer')
    applyLogtenCrewFields(entry!, {
      flight_selectedCrewPIC: 'Pat McDonald',
      flight_selectedCrewSIC: 'Sam DeLuca',
      'Training Instructor': 'First Officer',
    }, 'Pat McDonald')
    expect(entry?.trainingElements).toBe('Sam DeLuca')
    expect(entry?.trainingInstructor).toBe('First Officer')
  })
})

describe('Logifi-native CSV category class time and integrity fields', () => {
  const nativeBaseRow = {
    Date: '2025-03-06',
    Role: 'PIC',
    Registration: 'N4411F',
    Departure: 'KSEA',
    Destination: 'KPDX',
    'Aircraft Make/Model': 'E170',
    'Aircraft Category/Class': 'AMEL',
    PIC: '2.0',
    'Total Flight Time': '2.0',
  }

  it('appends Category Class Time without reordering existing headers', () => {
    expect(LOGIFI_NATIVE_HEADERS[LOGIFI_NATIVE_HEADERS.length - 1]).toBe(
      'Category Class Time'
    )
    expect(LOGIFI_NATIVE_HEADERS).toContain('Signature Pending')
    expect(
      LOGIFI_NATIVE_HEADERS.indexOf('Signature Pending')
    ).toBeLessThan(LOGIFI_NATIVE_HEADERS.indexOf('Category Class Time'))
    const original = createTestEntry({
      categoryClassTime: 1.9,
      flightTime: {
        ...createTestEntry().flightTime,
        total: 2.0,
        pic: 2.0,
      },
    })
    const row = mapEntryToLogifiNativeRow(original)
    expect(row).toHaveLength(LOGIFI_NATIVE_HEADERS.length)
    const obj = buildHeaderRowObject(LOGIFI_NATIVE_HEADERS, row)
    expect(obj['Category Class Time']).toBe('1.9')
    expect(obj['Total Flight Time']).toBe('2.0')
  })

  it('maps Category Class Time on native import and does not copy Total', () => {
    const entry = mapRawRowToLogEntry(
      { ...nativeBaseRow, 'Category Class Time': '1.9' },
      { source: 'logifi-native' }
    )
    expect(entry?.categoryClassTime).toBe(1.9)
    expect(entry?.flightTime.total).toBe(2.0)
  })

  it('keeps a blank Category Class Time blank on native import', () => {
    const entry = mapRawRowToLogEntry(
      { ...nativeBaseRow, 'Category Class Time': '' },
      { source: 'logifi-native' }
    )
    expect(entry?.categoryClassTime).toBeNull()
    expect(entry?.flightTime.total).toBe(2.0)
  })

  it('falls back to Total when older native CSV omits Category Class Time', () => {
    const entry = mapRawRowToLogEntry(nativeBaseRow, { source: 'logifi-native' })
    expect(entry?.categoryClassTime).toBe(2.0)
    expect(entry?.flightTime.total).toBe(2.0)
  })

  it('restores native integrity and import columns and preserves Is Imported', () => {
    const entry = mapRawRowToLogEntry(
      {
        ...nativeBaseRow,
        'Category Class Time': '1.9',
        'Is Imported': 'No',
        'Import Source': 'logten',
        'Import Batch ID': 'batch-fiction-001',
        'Original Entry Date': '2025-03-06T12:00:00.000Z',
        Version: '3',
        'Data Hash': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'Created At': '2025-03-06T12:00:00.000Z',
        'Updated At': '2025-03-07T08:30:00.000Z',
        'Import Metadata': '{"fileName":"fiction-logten.csv"}',
      },
      { source: 'logifi-native' }
    )
    expect(entry?.isImported).toBe(false)
    expect(entry?.importSource).toBe('logten')
    expect(entry?.importBatchId).toBe('batch-fiction-001')
    expect(entry?.originalEntryDate).toBe('2025-03-06T12:00:00.000Z')
    expect(entry?.version).toBe(3)
    expect(entry?.dataHash).toBe(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
    expect(entry?.createdAt).toBe('2025-03-06T12:00:00.000Z')
    expect(entry?.updatedAt).toBe('2025-03-07T08:30:00.000Z')
    expect(entry?.importMetadata).toEqual({ fileName: 'fiction-logten.csv' })
  })

  it('does not restore an invalid dataHash or version', () => {
    const entry = mapRawRowToLogEntry(
      {
        ...nativeBaseRow,
        Version: 'not-a-number',
        'Data Hash': 'not-a-sha256',
      },
      { source: 'logifi-native' }
    )
    expect(entry?.version).toBeUndefined()
    expect(entry?.dataHash).toBeUndefined()
  })

  it('does not apply native CSV metadata when the source is not logifi-native', () => {
    const entry = mapRawRowToLogEntry(
      {
        ...nativeBaseRow,
        'Category Class Time': '1.9',
        'Is Imported': 'No',
        'Import Source': 'logten',
        Version: '3',
        'Created At': '2025-03-06T12:00:00.000Z',
      },
      { source: 'generic' }
    )
    expect(entry?.isImported).toBe(true)
    expect(entry?.importSource).toBe('generic')
    expect(entry?.categoryClassTime).toBe(2.0)
    expect(entry?.version).toBeUndefined()
    expect(entry?.createdAt).toBeUndefined()
  })
})
