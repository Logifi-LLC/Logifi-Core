import { describe, it, expect } from 'vitest'
import { calculateSectionII, calculateSectionIII } from '../form8710Calculator'
import type { LogEntry } from '../logbookTypes'

describe('form8710Calculator', () => {
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

  describe('calculateSectionIII', () => {
    it('should return empty categories when no entries provided', () => {
      const result = calculateSectionIII([])
      
      expect(result.categories).toEqual([])
    })

    it('should calculate totals for airplane SEL entries', () => {
      const entries: LogEntry[] = [
        createTestEntry({
          aircraftCategoryClass: 'Airplane SEL',
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
      ]
      
      const result = calculateSectionIII(entries)
      
      expect(result.categories.length).toBeGreaterThan(0)
      const selCategory = result.categories.find(cat => cat.category === 'airplane-sel')
      expect(selCategory).toBeDefined()
      expect(selCategory?.totalFlights).toBe(1)
      expect(selCategory?.pic).toBe(2.0)
    })

    it('should categorize training devices correctly', () => {
      const entries: LogEntry[] = [
        createTestEntry({
          aircraftMakeModel: 'FFS-737',
          aircraftCategoryClass: 'Training Device',
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
      ]
      
      const result = calculateSectionIII(entries)
      
      const ffsCategory = result.categories.find(cat => cat.category === 'ffs')
      expect(ffsCategory).toBeDefined()
      expect(ffsCategory?.totalFlights).toBe(1)
    })

    it('should accumulate multiple entries correctly', () => {
      const entries: LogEntry[] = [
        createTestEntry({
          aircraftCategoryClass: 'Airplane SEL',
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
        }),
        createTestEntry({
          aircraftCategoryClass: 'Airplane SEL',
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
          }
        })
      ]
      
      const result = calculateSectionIII(entries)
      
      const selCategory = result.categories.find(cat => cat.category === 'airplane-sel')
      expect(selCategory?.totalFlights).toBe(2)
      expect(selCategory?.pic).toBe(3.5)
    })

    it('should handle cross-country time breakdowns', () => {
      const entries: LogEntry[] = [
        createTestEntry({
          aircraftCategoryClass: 'Airplane SEL',
          role: 'PIC',
          flightConditions: ['crossCountry'],
          flightTime: {
            total: 2.0,
            pic: 2.0,
            sic: null,
            dual: null,
            solo: null,
            night: null,
            actualInstrument: null,
            simulatedInstrument: null,
            crossCountry: 2.0
          }
        })
      ]
      
      const result = calculateSectionIII(entries)
      
      const selCategory = result.categories.find(cat => cat.category === 'airplane-sel')
      expect(selCategory?.crossCountryPic).toBe(2.0)
    })

    it('should handle night time breakdowns', () => {
      const entries: LogEntry[] = [
        createTestEntry({
          aircraftCategoryClass: 'Airplane SEL',
          role: 'PIC',
          flightConditions: ['nightVfr'],
          flightTime: {
            total: 2.0,
            pic: 2.0,
            sic: null,
            dual: null,
            solo: null,
            night: 2.0,
            actualInstrument: null,
            simulatedInstrument: null,
            crossCountry: null
          },
          performance: {
            dayTakeoffs: 0,
            dayLandings: 0,
            nightTakeoffs: 1,
            nightLandings: 1,
            approachCount: null,
            holdingProcedures: null
          }
        })
      ]
      
      const result = calculateSectionIII(entries)
      
      const selCategory = result.categories.find(cat => cat.category === 'airplane-sel')
      expect(selCategory?.nightPic).toBe(2.0)
      expect(selCategory?.nightTakeoffsLandingsPic).toBe(2)
    })
  })

  describe('calculateSectionII', () => {
    it('should return empty totals when no entries provided', () => {
      const result = calculateSectionII([])
      
      expect(result.totalTime).toBe(0)
      expect(result.picTime).toBe(0)
    })

    it('should calculate recent experience totals', () => {
      const today = new Date('2024-03-15')
      const recentDate = new Date(today)
      recentDate.setDate(recentDate.getDate() - 30) // 30 days ago
      
      const entries: LogEntry[] = [
        createTestEntry({
          date: recentDate.toISOString().split('T')[0],
          flightTime: {
            total: 5.0,
            pic: 5.0,
            sic: null,
            dual: null,
            solo: null,
            night: null,
            actualInstrument: null,
            simulatedInstrument: null,
            crossCountry: null
          }
        })
      ]
      
      const result = calculateSectionII(entries)
      
      expect(result.totalTime).toBe(5.0)
      expect(result.picTime).toBe(5.0)
    })

    it('should only include entries within 90 days', () => {
      const today = new Date('2024-03-15')
      const recentDate = new Date(today)
      recentDate.setDate(recentDate.getDate() - 30) // 30 days ago - should be included
      
      const oldDate = new Date(today)
      oldDate.setDate(oldDate.getDate() - 100) // 100 days ago - should be excluded
      
      const entries: LogEntry[] = [
        createTestEntry({
          date: recentDate.toISOString().split('T')[0],
          flightTime: {
            total: 5.0,
            pic: 5.0,
            sic: null,
            dual: null,
            solo: null,
            night: null,
            actualInstrument: null,
            simulatedInstrument: null,
            crossCountry: null
          }
        }),
        createTestEntry({
          date: oldDate.toISOString().split('T')[0],
          flightTime: {
            total: 10.0,
            pic: 10.0,
            sic: null,
            dual: null,
            solo: null,
            night: null,
            actualInstrument: null,
            simulatedInstrument: null,
            crossCountry: null
          }
        })
      ]
      
      const result = calculateSectionII(entries)
      
      expect(result.totalTime).toBe(5.0) // Only the recent entry
      expect(result.picTime).toBe(5.0)
    })
  })
})
