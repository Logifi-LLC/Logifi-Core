import { describe, it, expect } from 'vitest'
import {
  calculatePassengerCurrency,
  calculateNightCurrency,
  calculateInstrumentCurrency,
  calculateAnnualRequirements,
  formatCurrencyChip,
  formatCurrencyChipDate,
} from '../currencyCalculator'
import type { CurrencyStatus, LogEntry } from '../logbookTypes'

describe('currencyCalculator', () => {
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

  describe('calculatePassengerCurrency', () => {
    it('should return expired status when no entries provided', () => {
      const result = calculatePassengerCurrency([])
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
      expect(result.takeoffs).toBe(0)
      expect(result.landings).toBe(0)
    })

    it('should return current status when requirement is met', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      
      // Create 3 entries with takeoffs and landings within 90 days
      for (let i = 0; i < 3; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (i * 10)) // 0, 10, 20 days ago
        entries.push(createTestEntry({
          date: date.toISOString().split('T')[0],
          performance: {
            dayTakeoffs: 1,
            dayLandings: 1,
            nightTakeoffs: null,
            nightLandings: null,
            approachCount: null,
            holdingProcedures: null
          }
        }))
      }
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('current')
      expect(result.takeoffs).toBeGreaterThanOrEqual(3)
      expect(result.landings).toBeGreaterThanOrEqual(3)
    })

    it('should return expired status when entries are older than 90 days', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      
      // Create entries 100 days ago
      const oldDate = new Date(today)
      oldDate.setDate(oldDate.getDate() - 100)
      
      entries.push(createTestEntry({
        date: oldDate.toISOString().split('T')[0],
        performance: {
          dayTakeoffs: 10,
          dayLandings: 10,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
    })

    it('should calculate expiration date correctly', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      const entryDate = new Date(today)
      entryDate.setDate(entryDate.getDate() - 30) // 30 days ago
      
      entries.push(createTestEntry({
        date: entryDate.toISOString().split('T')[0],
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      // Expiration should be 90 days from the entry date
      const expectedExpiration = new Date(entryDate)
      expectedExpiration.setDate(expectedExpiration.getDate() + 90)
      
      expect(result.expirationDate.getTime()).toBeCloseTo(expectedExpiration.getTime(), -4) // Within a day
    })

    it('should return expiring_soon status when less than 30 days remaining', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      const entryDate = new Date(today)
      entryDate.setDate(entryDate.getDate() - 65) // 65 days ago (25 days remaining)
      
      entries.push(createTestEntry({
        date: entryDate.toISOString().split('T')[0],
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculatePassengerCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('expiring_soon')
    })
  })

  describe('calculateNightCurrency', () => {
    it('should return expired status when no night entries provided', () => {
      const result = calculateNightCurrency([])
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
    })

    it('should return current status when night requirement is met', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      
      // Create 3 entries with night takeoffs and landings
      for (let i = 0; i < 3; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (i * 10))
        entries.push(createTestEntry({
          date: date.toISOString().split('T')[0],
          flightConditions: ['nightVfr'],
          performance: {
            dayTakeoffs: 0,
            dayLandings: 0,
            nightTakeoffs: 1,
            nightLandings: 1,
            approachCount: null,
            holdingProcedures: null
          }
        }))
      }
      
      const result = calculateNightCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('current')
      expect(result.takeoffs).toBeGreaterThanOrEqual(3)
      expect(result.landings).toBeGreaterThanOrEqual(3)
    })

    it('should identify night entries by flight conditions', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      const entryDate = new Date(today)
      entryDate.setDate(entryDate.getDate() - 10)
      
      entries.push(createTestEntry({
        date: entryDate.toISOString().split('T')[0],
        flightConditions: ['nightVfr'],
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: 3,
          nightLandings: 3,
          approachCount: null,
          holdingProcedures: null
        }
      }))
      
      const result = calculateNightCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.qualifyingEntries.length).toBe(1)
    })
  })

  describe('calculateInstrumentCurrency', () => {
    it('should return expired status when no instrument entries provided', () => {
      const result = calculateInstrumentCurrency([])
      
      expect(result.isCurrent).toBe(false)
      expect(result.status).toBe('expired')
    })

    it('should return current status when instrument requirement is met', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      const entryDate = new Date(today)
      entryDate.setMonth(entryDate.getMonth() - 2) // 2 months ago
      
      entries.push(createTestEntry({
        date: entryDate.toISOString().split('T')[0],
        flightConditions: ['IFR'],
        flightTime: {
          total: 2.0,
          pic: 2.0,
          sic: null,
          dual: null,
          solo: null,
          night: null,
          actualInstrument: 2.0,
          simulatedInstrument: null,
          crossCountry: null
        },
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: 6,
          holdingProcedures: 1
        },
        remarks: 'Intercept and track procedures'
      }))
      
      const result = calculateInstrumentCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.approaches).toBeGreaterThanOrEqual(6)
      expect(result.holdingProcedures).toBeGreaterThan(0)
    })

    it('should be current with 6+ approaches and holding even without intercept/track in remarks', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      const entryDate = new Date(today)
      entryDate.setMonth(entryDate.getMonth() - 2)
      
      entries.push(createTestEntry({
        date: entryDate.toISOString().split('T')[0],
        flightConditions: ['IFR'],
        performance: {
          dayTakeoffs: 0,
          dayLandings: 0,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: 10,
          holdingProcedures: 5
        },
        remarks: '' // No intercept/track in remarks; 6+ approaches satisfy it organically
      }))
      
      const result = calculateInstrumentCurrency(entries, today)
      
      expect(result.isCurrent).toBe(true)
      expect(result.approaches).toBeGreaterThanOrEqual(6)
      expect(result.holdingProcedures).toBeGreaterThan(0)
    })
  })

  describe('calculateAnnualRequirements', () => {
    it('should return current status by default', () => {
      const result = calculateAnnualRequirements([])
      
      expect(result.isCurrent).toBe(true)
      expect(result.status).toBe('current')
    })

    it('should filter entries within the last year', () => {
      const entries: LogEntry[] = []
      const today = new Date('2024-03-15')
      
      // Entry within last year
      const recentDate = new Date(today)
      recentDate.setMonth(recentDate.getMonth() - 6)
      entries.push(createTestEntry({
        date: recentDate.toISOString().split('T')[0]
      }))
      
      // Entry older than a year
      const oldDate = new Date(today)
      oldDate.setFullYear(oldDate.getFullYear() - 2)
      entries.push(createTestEntry({
        date: oldDate.toISOString().split('T')[0]
      }))
      
      const result = calculateAnnualRequirements(entries, today)
      
      expect(result.qualifyingEntries.length).toBe(1)
    })
  })

  describe('formatCurrencyChip', () => {
    const ref = new Date('2026-04-01T12:00:00')

    function status(partial: Partial<CurrencyStatus>): CurrencyStatus {
      return {
        isCurrent: true,
        daysRemaining: 60,
        expirationDate: new Date('2026-04-12T12:00:00'),
        status: 'current',
        qualifyingEntries: [],
        ...partial,
      }
    }

    it('formats current chips with short date', () => {
      expect(formatCurrencyChip('passenger', status({}), ref)).toBe('90-day ✓ until Apr 12')
      expect(formatCurrencyChip('night', status({}), ref)).toBe('Night ✓ until Apr 12')
      expect(formatCurrencyChip('instrument', status({}), ref)).toBe('IFR ✓ until Apr 12')
    })

    it('includes year when expiration is not this year', () => {
      expect(
        formatCurrencyChip(
          'instrument',
          status({ expirationDate: new Date('2027-10-03T12:00:00') }),
          ref
        )
      ).toBe('IFR ✓ until Oct 3, 2027')
    })

    it('formats expiring soon with day counts', () => {
      expect(
        formatCurrencyChip(
          'night',
          status({ status: 'expiring_soon', daysRemaining: 8, isCurrent: true }),
          ref
        )
      ).toBe('Night expires in 8 days')
      expect(
        formatCurrencyChip(
          'passenger',
          status({ status: 'expiring_soon', daysRemaining: 1, isCurrent: true }),
          ref
        )
      ).toBe('90-day expires in 1 day')
      expect(
        formatCurrencyChip(
          'instrument',
          status({ status: 'expiring_soon', daysRemaining: 0, isCurrent: true }),
          ref
        )
      ).toBe('IFR expires today')
    })

    it('formats expired', () => {
      expect(
        formatCurrencyChip(
          'passenger',
          status({ status: 'expired', isCurrent: false, daysRemaining: 0 }),
          ref
        )
      ).toBe('90-day expired')
    })

    it('formats null currency as em dash', () => {
      expect(formatCurrencyChip('passenger', null, ref)).toBe('90-day —')
    })

    it('formatCurrencyChipDate omits same-year', () => {
      // Local noon avoids UTC date-string timezone shift (Apr 11 vs Apr 12).
      expect(formatCurrencyChipDate(new Date(2026, 3, 12, 12), ref)).toBe('Apr 12')
      expect(formatCurrencyChipDate(new Date(2027, 3, 12, 12), ref)).toBe('Apr 12, 2027')
    })
  })
})
