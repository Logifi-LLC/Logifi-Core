import { describe, it, expect } from 'vitest'
import {
  validateDate,
  validateFlightTime,
  validateCrossCountry,
  validatePart61RequiredFields
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
  })

  describe('validateCrossCountry', () => {
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
        'KJFK': { latitude: 40.6398, longitude: -73.7789 },
        'KBOS': { latitude: 42.3656, longitude: -71.0096 }
      })
      
      const errors = results.filter(r => r.type === 'error')
      expect(errors.length).toBe(0)
    })

    it('should warn when cross-country time exceeds total time', () => {
      const entry = createTestEntry({
        flightTime: {
          total: 2.0,
          pic: 2.0,
          crossCountry: 3.0, // Exceeds total
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: null,
          simulatedInstrument: null
        }
      })
      
      const results = validateCrossCountry(entry, {})
      
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
  })
})
