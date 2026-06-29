import { describe, it, expect } from 'vitest'
import {
  validateDate,
  validateFlightTime,
  validateCrossCountry,
  validatePart61RequiredFields,
  parseRouteAirportCodes,
  getEntryAirportCodes,
  getCatalogAirportCodes,
  computeCrossCountryDistanceNm,
  qualifiesForCrossCountryDistance,
  MIN_CROSS_COUNTRY_DISTANCE_NM
} from '../validation'
import type { LogEntry } from '../logbookTypes'

describe('validation', () => {
  const createTestEntry = (overrides: Partial<LogEntry>): LogEntry => ({
    id: 'test-id',
    date: '2024-01-01',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane SEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: {
      total: 1.5,
      pic: 1.5,
      sic: null,
      dual: null,
      solo: null,
      night: null,
      actualInstrument: null,
      simulatedInstrument: null,
      crossCountry: null
    },
    performance: {
      dayTakeoffs: 0,
      dayLandings: 0,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null
    },
    ...overrides
  })

  describe('validateDate', () => {
    it('should return no errors for valid date', () => {
      const entry = createTestEntry({
        date: '2024-01-15'
      })
      
      const results = validateDate(entry)
      
      expect(results.length).toBe(0)
    })

    it('should error for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const entry = createTestEntry({
        date: futureDate.toISOString().split('T')[0]
      })
      
      const results = validateDate(entry)
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].type).toBe('error')
      expect(results[0].field).toBe('date')
    })

    it('should warn for dates before 1900', () => {
      const entry = createTestEntry({
        date: '1899-12-31'
      })
      
      const results = validateDate(entry)
      
      const warnings = results.filter(r => r.type === 'warning')
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validateFlightTime', () => {
    it('should return no errors for valid flight time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validateFlightTime(entry)
      
      const errors = results.filter(r => r.type === 'error')
      expect(errors.length).toBe(0)
    })

    it('should error for negative total time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: -1.0,
          pic: null,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validateFlightTime(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'total')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should warn when PIC + SIC + Dual does not equal Total', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 5.0,
          pic: 2.0,
          sic: 2.0,
          dual: 2.0, // Should be 6.0 total, but total is 5.0
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validateFlightTime(entry)
      
      const warnings = results.filter(r => r.type === 'warning' && r.field === 'total')
      expect(warnings.length).toBeGreaterThan(0)
    })

    it('should warn when night time exceeds total time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: 3.0, // Exceeds total
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validateFlightTime(entry)
      
      const warnings = results.filter(r => r.type === 'warning' && r.field === 'night')
      expect(warnings.length).toBeGreaterThan(0)
    })

    it('should warn when PIC time exceeds total time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 3.0, // Exceeds total
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validateFlightTime(entry)
      
      const warnings = results.filter(r => r.type === 'warning' && r.field === 'pic')
      expect(warnings.length).toBeGreaterThan(0)
    })

    it('should error for negative NVG time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          nvg: -0.5,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })

      const results = validateFlightTime(entry)
      const errors = results.filter(r => r.type === 'error' && r.field === 'nvg')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should warn when NVG time exceeds total time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: 1.0,
          nvg: 3.0,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })

      const results = validateFlightTime(entry)
      const warnings = results.filter(r => r.type === 'warning' && r.field === 'nvg')
      expect(warnings.length).toBeGreaterThan(0)
    })

    it('should warn when NVG time exceeds night time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: 1.0,
          nvg: 1.5,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })

      const results = validateFlightTime(entry)
      const warnings = results.filter(
        r => r.type === 'warning' && r.field === 'nvg' && r.message.includes('night')
      )
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('parseRouteAirportCodes', () => {
    it('parses single and multiple space-separated codes', () => {
      expect(parseRouteAirportCodes('KFWA')).toEqual(['KFWA'])
      expect(parseRouteAirportCodes('KIND KMCX KLGA')).toEqual(['KIND', 'KMCX', 'KLGA'])
    })

    it('ignores short tokens and normalizes case', () => {
      expect(parseRouteAirportCodes('  klaf  KFWA  ')).toEqual(['KLAF', 'KFWA'])
      expect(parseRouteAirportCodes('AB CD')).toEqual([])
    })

    it('returns empty array for blank route', () => {
      expect(parseRouteAirportCodes('')).toEqual([])
      expect(parseRouteAirportCodes('   ')).toEqual([])
    })
  })

  describe('getCatalogAirportCodes', () => {
    it('includes departure and destination only', () => {
      expect(getCatalogAirportCodes({
        departure: 'KLAF',
        destination: 'KLAF'
      })).toEqual(['KLAF'])
    })
  })

  describe('getEntryAirportCodes', () => {
    it('includes classified route airports on the entry', () => {
      const classified = new Set(['KFWA'])
      expect(getEntryAirportCodes({
        departure: 'KLAF',
        destination: 'KLAF',
        route: 'KFWA FWA'
      }, classified)).toEqual(['KLAF', 'KFWA'])
    })

    it('excludes unclassified route tokens', () => {
      expect(getEntryAirportCodes({
        departure: 'KLAF',
        destination: 'KLAF',
        route: 'FWA'
      })).toEqual(['KLAF'])
    })
  })

  describe('computeCrossCountryDistanceNm', () => {
    const departure = { latitude: 40.0, longitude: -74.0 }
    const nearbyDestination = { latitude: 40.1, longitude: -74.0 }
    const farRouteStop = { latitude: 41.0, longitude: -74.0 }

    it('uses max distance from departure to destination and route stops', () => {
      const depToDest = computeCrossCountryDistanceNm(departure, nearbyDestination)
      expect(depToDest).toBeLessThan(MIN_CROSS_COUNTRY_DISTANCE_NM)

      const withRoute = computeCrossCountryDistanceNm(departure, nearbyDestination, [farRouteStop])
      expect(withRoute).toBeGreaterThanOrEqual(MIN_CROSS_COUNTRY_DISTANCE_NM)
      expect(withRoute).toBeGreaterThan(depToDest)
    })

    it('supports round-trip legs using route stops only', () => {
      const distance = computeCrossCountryDistanceNm(departure, departure, [farRouteStop])
      expect(distance).toBeGreaterThanOrEqual(MIN_CROSS_COUNTRY_DISTANCE_NM)
    })
  })

  describe('qualifiesForCrossCountryDistance', () => {
    it('requires at least 50nm', () => {
      expect(qualifiesForCrossCountryDistance(49.9)).toBe(false)
      expect(qualifiesForCrossCountryDistance(50)).toBe(true)
      expect(qualifiesForCrossCountryDistance(120)).toBe(true)
    })
  })

  describe('validateCrossCountry', () => {
    const kjfk = { latitude: 40.6398, longitude: -73.7789 }
    const kbos = { latitude: 42.3656, longitude: -71.0096 }
    const klaf = { latitude: 40.4127, longitude: -86.9369 }
    const kfwa = { latitude: 40.9785, longitude: -85.1951 }

    it('should return no errors for valid cross-country entry', () => {
      const entry = createTestEntry({
        departure: 'KJFK',
        destination: 'KBOS',
        flightConditions: ['crossCountry'],
        flightTime: {
          total: 2.0,
          pic: 2.0,
          crossCountry: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null
        }
      })

      const results = validateCrossCountry(entry, {
        departure: kjfk,
        destination: kbos
      })

      const errors = results.filter(r => r.type === 'error')
      expect(errors.length).toBe(0)
    })

    it('suggests XC for round-trip when route stop is beyond 50nm from departure', () => {
      const entry = createTestEntry({
        departure: 'KLAF',
        destination: 'KLAF',
        route: 'KFWA',
        flightTime: {
          total: 1.5,
          pic: 1.5,
          crossCountry: null,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null
        }
      })

      const results = validateCrossCountry(entry, {
        departure: klaf,
        destination: klaf,
        route: [kfwa]
      })

      const autoFix = results.find(r => r.field === 'crossCountry' && r.autoFix)
      expect(autoFix).toBeDefined()
      expect(autoFix?.autoFix?.value).toBe(1.5)
    })

    it('warns when same-airport round trip has XC but no qualifying route', () => {
      const entry = createTestEntry({
        departure: 'KLAF',
        destination: 'KLAF',
        route: '',
        flightTime: {
          total: 1.5,
          pic: 1.5,
          crossCountry: 1.5,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null
        }
      })

      const results = validateCrossCountry(entry, {})
      const warning = results.find(r => r.field === 'crossCountry' && r.message?.includes('same'))
      expect(warning).toBeDefined()
    })

    it('qualifies via route when departure and destination are closer than 50nm', () => {
      const departure = { latitude: 40.0, longitude: -74.0 }
      const nearbyDestination = { latitude: 40.1, longitude: -74.0 }
      const farRouteStop = { latitude: 41.0, longitude: -74.0 }

      const entry = createTestEntry({
        departure: 'KAAA',
        destination: 'KBBB',
        route: 'KCCC',
        flightTime: {
          total: 2.0,
          pic: 2.0,
          crossCountry: null,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null
        }
      })

      const results = validateCrossCountry(entry, {
        departure,
        destination: nearbyDestination,
        route: [farRouteStop]
      })

      expect(results.some(r => r.field === 'crossCountry' && r.autoFix)).toBe(true)
    })

    it('should warn when cross-country time exceeds total time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          crossCountry: 3.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null
        }
      })

      const results = validateFlightTime(entry)

      const warnings = results.filter(r => r.type === 'warning' && r.field === 'crossCountry')
      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validatePart61RequiredFields', () => {
    it('should return no errors for entry with all required fields', () => {
      const entry = createTestEntry({
        date: '2024-01-15',
        aircraftMakeModel: 'C172',
        registration: 'N12345',
        departure: 'KJFK',
        destination: 'KLGA',
        flightTime: {
          total: 2.0,
          pic: null,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error')
      expect(errors.length).toBe(0)
    })

    it('should error when date is missing', () => {
      const entry = createTestEntry({
        date: ''
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'date')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should error when aircraft make/model is missing', () => {
      const entry = createTestEntry({
        aircraftMakeModel: ''
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'aircraftMakeModel')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should error when registration is missing', () => {
      const entry = createTestEntry({
        registration: ''
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'registration')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should error when departure is missing', () => {
      const entry = createTestEntry({
        departure: ''
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'departure')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should error when destination is missing', () => {
      const entry = createTestEntry({
        destination: ''
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'destination')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should error when total time is missing', () => {
      const entry = createTestEntry({
        flightTime: {
          total: null,
          pic: null,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })
      
      const results = validatePart61RequiredFields(entry)
      
      const errors = results.filter(r => r.type === 'error' && r.field === 'total')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should not warn about day/night when flight conditions are empty and no night time', () => {
      const entry = createTestEntry({
        flightConditions: [],
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })

      const results = validatePart61RequiredFields(entry)

      const warnings = results.filter(r => r.type === 'warning' && r.field === 'flightConditions')
      expect(warnings.length).toBe(0)
    })

    it('should warn when night time is logged without night flight condition', () => {
      const entry = createTestEntry({
        flightConditions: [],
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: 1.0,
          actualInstrument: null,
          simulatedInstrument: null,
          crossCountry: null
        }
      })

      const results = validatePart61RequiredFields(entry)

      const warnings = results.filter(r => r.type === 'warning' && r.field === 'flightConditions')
      expect(warnings.length).toBe(1)
      expect(warnings[0]?.message).toContain('Night time is logged')
    })
  })
})
