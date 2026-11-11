import { describe, expect, it } from 'vitest'
import {
  applyEntryFormDurationInput,
  ENTRY_TIME_FORMAT_ERROR,
  fieldErrorMessage,
  finalizeEntryFormDuration,
  isIncompleteEntryDuration,
  parseEntryFormDuration,
} from '../entryFormFieldValidation'
import { createEmptyFlightTime, createEmptyPerformance, type LogEntry } from '../logbookTypes'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
    date: '2024-01-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KORD',
    destination: 'KMDW',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    logbookType: 'flight',
    flightTime: { ...createEmptyFlightTime(), total: 1.5, pic: 1.5 },
    performance: createEmptyPerformance(),
    ...overrides,
  }
}

describe('parseEntryFormDuration', () => {
  it('accepts decimal hours and H:MM the same as import', () => {
    expect(parseEntryFormDuration('1.5')).toEqual({ status: 'ok', value: 1.5 })
    expect(parseEntryFormDuration('1:30')).toEqual({ status: 'ok', value: 1.5 })
    expect(parseEntryFormDuration('0:48')).toEqual({ status: 'ok', value: 0.8 })
    expect(parseEntryFormDuration('')).toEqual({ status: 'empty', value: null })
    expect(parseEntryFormDuration('-')).toEqual({ status: 'empty', value: null })
  })

  it('rejects garbage with an actionable message', () => {
    expect(parseEntryFormDuration('abc')).toEqual({
      status: 'invalid',
      error: ENTRY_TIME_FORMAT_ERROR,
    })
    expect(parseEntryFormDuration('1:60')).toEqual({
      status: 'invalid',
      error: ENTRY_TIME_FORMAT_ERROR,
    })
  })

  it('treats in-progress decimal and clock typing as incomplete', () => {
    expect(isIncompleteEntryDuration('1:')).toBe(true)
    expect(isIncompleteEntryDuration('1.')).toBe(true)
    expect(parseEntryFormDuration('1:')).toEqual({ status: 'incomplete' })
  })
})

describe('applyEntryFormDurationInput', () => {
  it('does not wipe the stored value while the clock time is incomplete', () => {
    let stored: number | null = 1.5
    expect(applyEntryFormDurationInput('1:', (v) => { stored = v })).toBeNull()
    expect(stored).toBe(1.5)
  })

  it('finalizes 1. as 1.0 hours on blur', () => {
    expect(finalizeEntryFormDuration('1.')).toEqual({ status: 'ok', value: 1 })
    expect(finalizeEntryFormDuration('1:')).toEqual({
      status: 'invalid',
      error: ENTRY_TIME_FORMAT_ERROR,
    })
  })

  it('commits 1:30 as 1.5 hours', () => {
    let stored: number | null = null
    expect(applyEntryFormDurationInput('1:30', (v) => { stored = v })).toBeNull()
    expect(stored).toBe(1.5)
  })

  it('returns the format error without assigning invalid input', () => {
    let stored: number | null = 1.5
    expect(applyEntryFormDurationInput('nope', (v) => { stored = v })).toBe(
      ENTRY_TIME_FORMAT_ERROR
    )
    expect(stored).toBe(1.5)
  })
})

describe('fieldErrorMessage', () => {
  it('asks for a date on blur of an empty required date', () => {
    expect(fieldErrorMessage(entry({ date: '' }), 'date')).toBe('Enter a date')
  })

  it('rejects a future date', () => {
    expect(fieldErrorMessage(entry({ date: '2099-01-01' }), 'date')).toBe(
      'Date cannot be in the future'
    )
  })

  it('asks for a 3–4 character airport code', () => {
    expect(fieldErrorMessage(entry({ departure: 'AB' }), 'departure')).toBe(
      'Enter a 3–4 character airport code'
    )
  })

  it('surfaces PIC exceeding total as Total must be at least PIC', () => {
    const over = entry({
      flightTime: { ...createEmptyFlightTime(), total: 1.0, pic: 1.5 },
    })
    expect(fieldErrorMessage(over, 'pic')).toBe('Total must be at least PIC')
    expect(fieldErrorMessage(over, 'total')).toBe('Total must be at least PIC')
  })

  it('surfaces night exceeding total as Total must be at least Night', () => {
    const over = entry({
      flightTime: { ...createEmptyFlightTime(), total: 1.0, pic: 1.0, night: 1.5 },
    })
    expect(fieldErrorMessage(over, 'night')).toBe('Total must be at least Night')
  })

  it('asks for total time when required by Part 61', () => {
    const missing = entry({
      flightTime: createEmptyFlightTime(),
    })
    expect(fieldErrorMessage(missing, 'total')).toBe('Enter total time')
  })

  it('does not invent Part 61 errors for simulator entries', () => {
    const sim = entry({
      logbookType: 'simulator',
      date: '',
      departure: '',
      flightTime: createEmptyFlightTime(),
    })
    expect(fieldErrorMessage(sim, 'date')).toBeNull()
    expect(fieldErrorMessage(sim, 'total')).toBeNull()
    expect(fieldErrorMessage(sim, 'departure')).toBeNull()
  })

  it('does not error a complete valid flight on blur', () => {
    expect(fieldErrorMessage(entry(), 'date')).toBeNull()
    expect(fieldErrorMessage(entry(), 'departure')).toBeNull()
    expect(fieldErrorMessage(entry(), 'pic')).toBeNull()
    expect(fieldErrorMessage(entry(), 'total')).toBeNull()
  })
})
