import { describe, it, expect } from 'vitest'
import { buildLogTenFlightEntity, buildLogTenPackage } from '../../app/utils/logtenHandoff'
import type { LogEntry } from '../../app/utils/logbookTypes'

function createBaseEntry(): LogEntry {
  return {
    id: 'test-123',
    date: '2024-01-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: 1.5,
    aircraftMakeModel: 'Cessna 172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KPHX',
    destination: 'KSDL',
    route: 'Direct',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: {
      total: 1.5,
      pic: null,
      sic: null,
      dual: null,
      solo: null,
      night: null,
      actualInstrument: null,
      dualGiven: null,
      crossCountry: null,
      simulatedInstrument: null,
    },
    performance: {
      dayTakeoffs: null,
      nightTakeoffs: null,
      dayLandings: null,
      nightLandings: null,
      approachCount: null,
      approachType: null,
      approaches: [],
      holdingProcedures: null,
    },
  }
}

describe('buildLogTenFlightEntity', () => {
  it('includes required basic fields', () => {
    const entry = createBaseEntry()
    const entity = buildLogTenFlightEntity(entry)

    expect(entity.entity_name).toBe('Flight')
    expect(entity.flight_key).toBe('test-123')
    expect(entity.flight_flightDate).toBe('01/15/2024')
    expect(entity.flight_from).toBe('KPHX')
    expect(entity.flight_to).toBe('KSDL')
    expect(entity.flight_totalTime).toBe('1.5')
  })

  it('preserves date without timezone shifting - MDY format per Coradine API', () => {
    const entry = createBaseEntry()
    entry.date = '2026-09-08'
    const entity = buildLogTenFlightEntity(entry)

    // Date should be formatted as MM/dd/yyyy to match LogTen metadata
    expect(entity.flight_flightDate).toBe('09/08/2026')
    expect(typeof entity.flight_flightDate).toBe('string')
  })

  it('reproduces Derek bug: 9/8 entry should become 09/08/2026 in package, not 09/07/2026', () => {
    // Derek enters 9/8 with defaultYear 2026
    // Expected: LogTen package should contain '09/08/2026' (MDY format)
    // Bug: ISO '2026-09-08' was parsed as UTC midnight by LogTen NSDateFormatter,
    //      displaying as 09/07/2026 in US Central (UTC-6)
    const entry = createBaseEntry()
    entry.date = '2026-09-08' // After normalization from 9/8 + defaultYear 2026
    
    const pkg = buildLogTenPackage([entry])
    const entity = pkg.entities[0]
    
    // Verify metadata matches Coradine sample
    expect(pkg.metadata.dateFormat).toBe('MM/dd/yyyy')
    expect(pkg.metadata.dateAndTimeFormat).toBe('MM/dd/yyyy HH:mm')
    
    // Verify the exact date string in the package is MDY format
    expect(entity.flight_flightDate).toBe('09/08/2026')
    expect(entity.flight_flightDate).not.toBe('09/07/2026')
    expect(entity.flight_flightDate).not.toBe('2026-09-08') // No longer ISO
    
    // Verify it's a plain string, not influenced by Date object timezone conversion
    expect(typeof entity.flight_flightDate).toBe('string')
    
    // Verify the JSON encoding doesn't alter the date
    const jsonString = JSON.stringify(pkg)
    expect(jsonString).toContain('"flight_flightDate":"09/08/2026"')
    expect(jsonString).not.toContain('"flight_flightDate":"09/07/2026"')
    expect(jsonString).not.toContain('"flight_flightDate":"2026-09-08"')
  })

  it('maps aircraft fields', () => {
    const entry = createBaseEntry()
    entry.registration = 'N999XY'
    entry.aircraftMakeModel = 'Piper PA-28'
    entry.aircraftCategoryClass = 'ASEL'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedAircraftID).toBe('N999XY')
    expect(entity.flight_selectedAircraftType).toBe('Piper PA-28')
    expect(entity.flight_selectedAircraftClass).toBe('ASEL')
  })

  it('maps flight number and route', () => {
    const entry = createBaseEntry()
    entry.flightNumber = 'AA1234'
    entry.route = 'KPHX-BTY-GBN-KSDL'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_flightNumber).toBe('AA1234')
    expect(entity.flight_route).toBe('KPHX-BTY-GBN-KSDL')
  })

  it('maps remarks', () => {
    const entry = createBaseEntry()
    entry.remarks = 'Excellent visibility, practiced power-off stalls'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_remarks).toBe('Excellent visibility, practiced power-off stalls')
  })

  it('maps PIC and SIC times', () => {
    const entry = createBaseEntry()
    entry.flightTime.pic = 1.5
    entry.flightTime.sic = 0.5

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_pic).toBe('1.5')
    expect(entity.flight_sic).toBe('0.5')
  })

  it('maps night time', () => {
    const entry = createBaseEntry()
    entry.flightTime.night = 0.8

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_night).toBe('0.8')
  })

  it('maps cross country time', () => {
    const entry = createBaseEntry()
    entry.flightTime.crossCountry = 1.3

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_crossCountry).toBe('1.3')
  })

  it('maps dual received time', () => {
    const entry = createBaseEntry()
    entry.flightTime.dual = 1.2

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_dualReceived).toBe('1.2')
  })

  it('maps solo time', () => {
    const entry = createBaseEntry()
    entry.flightTime.solo = 1.5

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_solo).toBe('1.5')
  })

  it('maps actual instrument time', () => {
    const entry = createBaseEntry()
    entry.flightTime.actualInstrument = 0.7

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_actualInstrument).toBe('0.7')
  })

  it('maps simulated instrument (hood) time', () => {
    const entry = createBaseEntry()
    entry.flightTime.simulatedInstrument = 0.5

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_simulatedInstrument).toBe('0.5')
  })

  it('maps dual given time', () => {
    const entry = createBaseEntry()
    entry.flightTime.dualGiven = 1.8

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_dualGiven).toBe('1.8')
  })

  it('maps NVG time', () => {
    const entry = createBaseEntry()
    entry.flightTime.nvg = 2.3

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_nightVisionGoggle).toBe('2.3')
  })

  it('combines FFS, FTD, and ATD into ground simulator time', () => {
    const entry = createBaseEntry()
    entry.flightTime.ffs = 1.0
    entry.flightTime.ftd = 0.5
    entry.flightTime.atd = 0.3

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_ground).toBe('1.8')
  })

  it('maps day landings', () => {
    const entry = createBaseEntry()
    entry.performance.dayLandings = 3

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_dayLandings).toBe(3)
  })

  it('maps night landings', () => {
    const entry = createBaseEntry()
    entry.performance.nightLandings = 2

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_nightLandings).toBe(2)
  })

  it('maps day takeoffs', () => {
    const entry = createBaseEntry()
    entry.performance.dayTakeoffs = 4

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_dayTakeoffs).toBe(4)
  })

  it('maps night takeoffs', () => {
    const entry = createBaseEntry()
    entry.performance.nightTakeoffs = 1

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_nightTakeoffs).toBe(1)
  })

  it('maps holding procedures', () => {
    const entry = createBaseEntry()
    entry.performance.holdingProcedures = 2

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_holds).toBe(2)
  })

  it('maps single approach', () => {
    const entry = createBaseEntry()
    entry.performance.approaches = [{ type: 'ILS', count: 1 }]

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedApproach1).toBe('ILS')
  })

  it('maps multiple approaches with counts', () => {
    const entry = createBaseEntry()
    entry.performance.approaches = [
      { type: 'ILS', count: 2 },
      { type: 'RNAV', count: 3 },
      { type: 'VOR', count: 1 },
    ]

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedApproach1).toBe('ILS (2)')
    expect(entity.flight_selectedApproach2).toBe('RNAV (3)')
    expect(entity.flight_selectedApproach3).toBe('VOR')
  })

  it('maps legacy approach count/type to modern approach', () => {
    const entry = createBaseEntry()
    entry.performance.approachCount = 2
    entry.performance.approachType = 'GPS'
    entry.performance.approaches = [] // Empty, so legacy fields used

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedApproach1).toBe('GPS (2)')
  })

  it('limits approaches to 10 maximum', () => {
    const entry = createBaseEntry()
    entry.performance.approaches = Array.from({ length: 15 }, (_, i) => ({
      type: `TYPE${i + 1}`,
      count: 1,
    }))

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedApproach1).toBeDefined()
    expect(entity.flight_selectedApproach10).toBeDefined()
    expect(entity.flight_selectedApproach11).toBeUndefined()
  })

  it('maps PIC name', () => {
    const entry = createBaseEntry()
    entry.picName = 'John Smith'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedCrewPIC).toBe('John Smith')
  })

  it('maps SIC name', () => {
    const entry = createBaseEntry()
    entry.sicName = 'Jane Doe'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedCrewSIC).toBe('Jane Doe')
  })

  it('maps instructor crew member', () => {
    const entry = createBaseEntry()
    entry.trainingElements = 'Bob Johnson'
    entry.trainingInstructor = 'Instructor'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedCrewInstructor).toBe('Bob Johnson')
  })

  it('maps student crew member', () => {
    const entry = createBaseEntry()
    entry.trainingElements = 'Alice Williams'
    entry.trainingInstructor = 'Student'

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_selectedCrewStudent).toBe('Alice Williams')
  })

  it('maps OOOI times correctly', () => {
    const entry = createBaseEntry()
    entry.oooi = {
      out: '2024-01-15T14:30:00Z',
      off: '2024-01-15T14:35:00Z',
      on: '2024-01-15T16:00:00Z',
      in: '2024-01-15T16:05:00Z',
      isZulu: true,
    }

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_taxiOutTime).toBe('2024-01-15T14:30:00.000Z')
    expect(entity.flight_takeoffTime_zulu).toBe('2024-01-15T14:35:00.000Z')
    expect(entity.flight_landingTime_zulu).toBe('2024-01-15T16:00:00.000Z')
    expect(entity.flight_taxiInTime).toBe('2024-01-15T16:05:00.000Z')
  })

  it('handles invalid OOOI times gracefully', () => {
    const entry = createBaseEntry()
    entry.oooi = {
      out: 'invalid-date',
      off: null,
      on: null,
      in: null,
      isZulu: true,
    }

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_taxiOutTime).toBeUndefined()
  })

  it('sets IFR capacity flag when IFR condition present', () => {
    const entry = createBaseEntry()
    entry.flightConditions = ['IFR', 'Night']

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_ifrCapacity).toBe(true)
  })

  it('sets simulator type for simulator logbook entries', () => {
    const entry = createBaseEntry()
    entry.logbookType = 'simulator'
    entry.flightTime.total = 2.0

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_simulator).toBe('2.0')
    expect(entity.flight_type).toBe(3)
  })

  it('omits optional fields when values are null', () => {
    const entry = createBaseEntry()
    entry.flightTime.night = null
    entry.performance.dayLandings = null

    const entity = buildLogTenFlightEntity(entry)

    expect(entity.flight_night).toBeUndefined()
    expect(entity.flight_dayLandings).toBeUndefined()
  })

  it('handles complete entry with all fields', () => {
    const entry: LogEntry = {
      id: 'full-test',
      date: '2024-03-20',
      role: 'PIC',
      aircraftCategoryClass: 'AMEL',
      categoryClassTime: 2.5,
      aircraftMakeModel: 'Piper PA-44',
      registration: 'N5678Z',
      flightNumber: 'DAL123',
      departure: 'KAUS',
      destination: 'KDFW',
      route: 'KAUS-ACT-KDFW',
      trainingElements: 'Sarah Pilot',
      trainingInstructor: 'Instructor',
      instructorCertificate: 'CFI123',
      picName: 'John Captain',
      sicName: 'Jane First Officer',
      flightConditions: ['IFR', 'Night'],
      remarks: 'Night IFR cross country with approaches',
      flightTime: {
        total: 2.5,
        pic: 2.5,
        sic: 0,
        dual: 0,
        solo: 0,
        night: 1.2,
        actualInstrument: 0.8,
        dualGiven: 0,
        crossCountry: 2.5,
        simulatedInstrument: 0,
        nvg: 0,
        ffs: 0,
        ftd: 0,
        atd: 0,
      },
      performance: {
        dayTakeoffs: 1,
        nightTakeoffs: 0,
        dayLandings: 0,
        nightLandings: 1,
        approachCount: null,
        approachType: null,
        approaches: [
          { type: 'ILS', count: 2 },
          { type: 'RNAV', count: 1 },
        ],
        holdingProcedures: 1,
      },
      oooi: {
        out: '2024-03-20T19:30:00Z',
        off: '2024-03-20T19:35:00Z',
        on: '2024-03-20T22:00:00Z',
        in: '2024-03-20T22:05:00Z',
        isZulu: true,
      },
    }

    const entity = buildLogTenFlightEntity(entry)

    // Verify core fields
    expect(entity.flight_key).toBe('full-test')
    expect(entity.flight_flightDate).toBe('03/20/2024')
    
    // Verify aircraft
    expect(entity.flight_selectedAircraftID).toBe('N5678Z')
    expect(entity.flight_selectedAircraftType).toBe('Piper PA-44')
    expect(entity.flight_selectedAircraftClass).toBe('AMEL')
    
    // Verify route
    expect(entity.flight_from).toBe('KAUS')
    expect(entity.flight_to).toBe('KDFW')
    expect(entity.flight_route).toBe('KAUS-ACT-KDFW')
    
    // Verify times
    expect(entity.flight_totalTime).toBe('2.5')
    expect(entity.flight_pic).toBe('2.5')
    expect(entity.flight_night).toBe('1.2')
    expect(entity.flight_actualInstrument).toBe('0.8')
    expect(entity.flight_crossCountry).toBe('2.5')
    
    // Verify performance
    expect(entity.flight_dayTakeoffs).toBe(1)
    expect(entity.flight_nightLandings).toBe(1)
    expect(entity.flight_holds).toBe(1)
    
    // Verify approaches
    expect(entity.flight_selectedApproach1).toBe('ILS (2)')
    expect(entity.flight_selectedApproach2).toBe('RNAV')
    
    // Verify crew
    expect(entity.flight_selectedCrewPIC).toBe('John Captain')
    expect(entity.flight_selectedCrewSIC).toBe('Jane First Officer')
    expect(entity.flight_selectedCrewInstructor).toBe('Sarah Pilot')
    
    // Verify OOOI
    expect(entity.flight_taxiOutTime).toBeDefined()
    expect(entity.flight_takeoffTime_zulu).toBeDefined()
    expect(entity.flight_landingTime_zulu).toBeDefined()
    expect(entity.flight_taxiInTime).toBeDefined()
    
    // Verify flags
    expect(entity.flight_ifrCapacity).toBe(true)
  })
})

describe('buildLogTenPackage', () => {
  it('creates package with correct metadata matching Coradine sample', () => {
    const entry = createBaseEntry()
    const pkg = buildLogTenPackage([entry])

    expect(pkg.metadata.application).toBe('Digifi/Logifi')
    expect(pkg.metadata.version).toBe('1.0')
    expect(pkg.metadata.serviceID).toBe('com.logifi.digifi')
    expect(pkg.metadata.dateFormat).toBe('MM/dd/yyyy')
    expect(pkg.metadata.dateAndTimeFormat).toBe('MM/dd/yyyy HH:mm')
    expect(pkg.metadata.timesAreZulu).toBe(true)
  })

  it('includes all entries in entities array', () => {
    const entries = [
      createBaseEntry(),
      { ...createBaseEntry(), id: 'test-456', date: '2024-01-16' },
    ]
    const pkg = buildLogTenPackage(entries)

    expect(pkg.entities).toHaveLength(2)
    expect(pkg.entities[0].flight_key).toBe('test-123')
    expect(pkg.entities[1].flight_key).toBe('test-456')
  })
})
