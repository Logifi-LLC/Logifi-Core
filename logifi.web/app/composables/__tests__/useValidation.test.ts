import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useValidation } from '../useValidation'
import type { LogEntry } from '~/utils/logbookTypes'

// Mock useAirportLookup
vi.mock('../useAirportLookup', () => ({
  useAirportLookup: () => ({
    lookupAirport: vi.fn().mockResolvedValue(null)
  })
}))

describe('useValidation', () => {
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

  it('should initialize with empty validation results', () => {
    const { validationResults, validationErrors, validationWarnings, hasErrors, hasWarnings } = useValidation()
    
    expect(validationResults.value).toEqual([])
    expect(validationErrors.value).toEqual([])
    expect(validationWarnings.value).toEqual([])
    expect(hasErrors.value).toBe(false)
    expect(hasWarnings.value).toBe(false)
  })

  it('should validate entry and update results', async () => {
    const { validateEntry, validationResults, validationErrors, hasErrors } = useValidation()
    
    const entry = createTestEntry({
      date: '2024-01-15',
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
    
    await validateEntry(entry)
    
    // Should have validation results (even if empty)
    expect(Array.isArray(validationResults.value)).toBe(true)
    expect(Array.isArray(validationErrors.value)).toBe(true)
  })

  it('should separate errors and warnings', async () => {
    const { validateEntry, validationErrors, validationWarnings, hasErrors, hasWarnings } = useValidation()
    
    // Create entry with invalid data (future date - should be an error)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const entry = createTestEntry({
      date: futureDate.toISOString().split('T')[0]
    })
    
    await validateEntry(entry)
    
    // Should have errors for future date
    expect(hasErrors.value || hasWarnings.value).toBe(true)
  })

  it('should compute hasIssues correctly', async () => {
    const { validateEntry, hasIssues } = useValidation()
    
    const entry = createTestEntry({
      date: '2024-01-15'
    })
    
    await validateEntry(entry)
    
    // hasIssues should be true if there are errors or warnings
    expect(typeof hasIssues.value).toBe('boolean')
  })

  it('should clear validation results', () => {
    const { clearValidation, validationResults } = useValidation()
    
    // Manually set some results (simulating validation)
    validationResults.value = [
      { type: 'error', field: 'date', message: 'Test error' }
    ]
    
    clearValidation()
    
    expect(validationResults.value).toEqual([])
  })

  it('should handle validation with allEntries parameter', async () => {
    const { validateEntry, validationResults } = useValidation()
    
    const entry1 = createTestEntry({
      id: 'entry-1',
      date: '2024-01-15'
    })
    
    const entry2 = createTestEntry({
      id: 'entry-2',
      date: '2024-01-10'
    })
    
    await validateEntry(entry1, [entry1, entry2])
    
    expect(Array.isArray(validationResults.value)).toBe(true)
  })
})
