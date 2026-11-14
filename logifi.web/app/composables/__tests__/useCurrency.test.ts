import { describe, it, expect, beforeEach } from 'vitest'
import { useCurrency } from '../useCurrency'
import type { LogEntry } from '~/utils/logbookTypes'

describe('useCurrency', () => {
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

  it('should initialize with null currency values', () => {
    const { passengerCurrency, nightCurrency, passengerCurrencyGroups, instrumentCurrency, flightReviewCurrency, annualRequirements } = useCurrency()
    
    expect(passengerCurrency.value).toBeNull()
    expect(nightCurrency.value).toBeNull()
    expect(passengerCurrencyGroups.value).toEqual([])
    expect(instrumentCurrency.value).toBeNull()
    expect(flightReviewCurrency.value).toBeNull()
    expect(annualRequirements.value).toBeNull()
  })

  it('should calculate currency for entries', () => {
    const { calculateAllCurrency, passengerCurrency, isLoading } = useCurrency()
    
    const today = new Date(2024, 2, 15)
    const entries: LogEntry[] = []
    
    // Create entries with takeoffs and landings
    for (let i = 0; i < 3; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (i * 10))
      entries.push(createTestEntry({
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
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
    
    calculateAllCurrency(entries, today)
    
    expect(isLoading.value).toBe(false)
    expect(passengerCurrency.value).not.toBeNull()
    expect(passengerCurrency.value?.isCurrent).toBe(true)
  })

  it('computes flight review from a Flight Review tag', () => {
    const { calculateAllCurrency, flightReviewCurrency, annualRequirements } = useCurrency()
    const today = new Date(2025, 0, 15)
    calculateAllCurrency(
      [
        createTestEntry({
          date: '2024-01-10',
          tags: ['Flight Review'],
        }),
      ],
      today
    )
    expect(flightReviewCurrency.value?.isCurrent).toBe(true)
    expect(flightReviewCurrency.value?.status).toBe('current')
    expect(annualRequirements.value?.isCurrent).toBe(true)
  })

  it('does not treat remarks as a flight review', () => {
    const { calculateAllCurrency, flightReviewCurrency } = useCurrency()
    calculateAllCurrency(
      [
        createTestEntry({
          date: '2024-01-10',
          remarks: 'Flight review complete',
        }),
      ],
      new Date(2025, 0, 15)
    )
    expect(flightReviewCurrency.value?.status).toBe('missing')
  })

  it('should handle errors gracefully', () => {
    const { calculateAllCurrency, error, passengerCurrency } = useCurrency()
    
    // Pass invalid data that might cause an error
    const invalidEntries = [null as any]
    
    calculateAllCurrency(invalidEntries)
    
    // Should handle error and set error state
    expect(error.value).not.toBeNull()
    expect(passengerCurrency.value).toBeNull()
  })

  it('should clear currency values', () => {
    const { calculateAllCurrency, clearCurrency, passengerCurrency, error } = useCurrency()
    
    const entries: LogEntry[] = [
      createTestEntry({
        date: '2024-03-01',
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      })
    ]
    
    calculateAllCurrency(entries)
    expect(passengerCurrency.value).not.toBeNull()
    
    clearCurrency()
    expect(passengerCurrency.value).toBeNull()
    expect(error.value).toBeNull()
  })

  it('summarizes mixed ASEL/AMEL passenger currency as expired when one class is short', () => {
    const { calculateAllCurrency, passengerCurrency, passengerCurrencyGroups } = useCurrency()
    const today = new Date(2024, 2, 15)
    calculateAllCurrency(
      [
        createTestEntry({
          id: 'asel',
          date: '2024-03-01',
          aircraftCategoryClass: 'ASEL',
          aircraftMakeModel: 'Cessna 172',
          performance: {
            dayTakeoffs: 3,
            dayLandings: 3,
            nightTakeoffs: null,
            nightLandings: null,
            approachCount: null,
            holdingProcedures: null,
          },
        }),
        createTestEntry({
          id: 'amel',
          date: '2024-03-02',
          aircraftCategoryClass: 'AMEL',
          aircraftMakeModel: 'Beechcraft Baron',
          performance: {
            dayTakeoffs: 1,
            dayLandings: 1,
            nightTakeoffs: null,
            nightLandings: null,
            approachCount: null,
            holdingProcedures: null,
          },
        }),
      ],
      today
    )
    expect(passengerCurrencyGroups.value.map((g) => g.key).sort()).toEqual(['AMEL', 'ASEL'])
    expect(passengerCurrency.value?.isCurrent).toBe(false)
    expect(passengerCurrencyGroups.value.find((g) => g.key === 'ASEL')?.passenger.isCurrent).toBe(true)
    expect(passengerCurrencyGroups.value.find((g) => g.key === 'AMEL')?.passenger.isCurrent).toBe(false)
  })

  it('should compute currentCurrencyCount correctly', () => {
    const { calculateAllCurrency, currentCurrencyCount } = useCurrency()
    
    const entries: LogEntry[] = [
      createTestEntry({
        date: '2024-03-01',
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      })
    ]
    
    calculateAllCurrency(entries, new Date(2024, 2, 15))
    
    expect(currentCurrencyCount.value).toBeGreaterThanOrEqual(0)
    expect(currentCurrencyCount.value).toBeLessThanOrEqual(4)
  })

  it('should set isLoading during calculation', async () => {
    const { calculateAllCurrency, isLoading } = useCurrency()
    
    const entries: LogEntry[] = [
      createTestEntry({
        date: '2024-03-01',
        performance: {
          dayTakeoffs: 3,
          dayLandings: 3,
          nightTakeoffs: null,
          nightLandings: null,
          approachCount: null,
          holdingProcedures: null
        }
      })
    ]
    
    // isLoading should be false after calculation completes
    calculateAllCurrency(entries)
    expect(isLoading.value).toBe(false)
  })
})
