import { describe, expect, it } from 'vitest'
import {
  applyEntryFormDurationInput,
  commitDurationDrafts,
  durationFieldDisplay,
  ENTRY_TIME_FORMAT_ERROR,
  fieldErrorMessage,
  finalizeEntryFormDuration,
  formatEntryTimeDisplay,
  isIncompleteEntryDuration,
  onEntryDurationBlur,
  onEntryDurationKeystroke,
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
    expect(parseEntryFormDuration('1.3')).toEqual({ status: 'ok', value: 1.3 })
    expect(parseEntryFormDuration('1.5')).toEqual({ status: 'ok', value: 1.5 })
    expect(parseEntryFormDuration('0.7')).toEqual({ status: 'ok', value: 0.7 })
    expect(parseEntryFormDuration('12.4')).toEqual({ status: 'ok', value: 12.4 })
    expect(parseEntryFormDuration('.8')).toEqual({ status: 'ok', value: 0.8 })
    expect(parseEntryFormDuration('1:18')).toEqual({ status: 'ok', value: 1.3 })
    expect(parseEntryFormDuration('1:30')).toEqual({ status: 'ok', value: 1.5 })
    expect(parseEntryFormDuration('0:48')).toEqual({ status: 'ok', value: 0.8 })
    expect(parseEntryFormDuration('')).toEqual({ status: 'empty', value: null })
    expect(parseEntryFormDuration('-')).toEqual({ status: 'empty', value: null })
  })

  it('rounds 1.25 to the nearest tenth (1.3), not floor', () => {
    expect(parseEntryFormDuration('1.25')).toEqual({ status: 'ok', value: 1.3 })
    expect(finalizeEntryFormDuration('1.25')).toEqual({ status: 'ok', value: 1.3 })
  })

  it('rejects garbage with an actionable message', () => {
    expect(ENTRY_TIME_FORMAT_ERROR).toBe('Enter time as 1.3 or 1:18')
    expect(parseEntryFormDuration('abc')).toEqual({
      status: 'invalid',
      error: ENTRY_TIME_FORMAT_ERROR,
    })
    expect(parseEntryFormDuration('-1')).toEqual({
      status: 'invalid',
      error: ENTRY_TIME_FORMAT_ERROR,
    })
    expect(parseEntryFormDuration('1:75')).toEqual({
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
    expect(isIncompleteEntryDuration('.')).toBe(true)
    expect(parseEntryFormDuration('1:')).toEqual({ status: 'incomplete' })
    expect(parseEntryFormDuration('.')).toEqual({ status: 'incomplete' })
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

describe('durationFieldDisplay drafts', () => {
  it('does not rewrite 1 / 1. / 1.3 while a draft is present', () => {
    let model: number | null = null
    let draft: string | undefined
    const type = (raw: string) => {
      const result = onEntryDurationKeystroke(raw, (v) => { model = v })
      draft = result.draft
      return result
    }

    expect(type('1').formatError).toBeNull()
    expect(durationFieldDisplay(draft, model)).toBe('1')
    expect(model).toBe(1)
    expect(formatEntryTimeDisplay(model)).toBe('1.0')

    expect(type('1.').formatError).toBeNull()
    expect(durationFieldDisplay(draft, model)).toBe('1.')
    expect(model).toBe(1)

    expect(type('1.3').formatError).toBeNull()
    expect(durationFieldDisplay(draft, model)).toBe('1.3')
    expect(model).toBe(1.3)

    const blurred = onEntryDurationBlur('1.3', () => model, (v) => { model = v })
    expect(blurred).toEqual({ display: '1.3', formatError: null })
    expect(model).toBe(1.3)
    expect(durationFieldDisplay(undefined, model)).toBe('1.3')
  })

  it('keeps .8 / 0.7 / 12.4 / 1:18 as typed until blur, then formats tenths', () => {
    const run = (keys: string[], expectedModel: number, formatted: string) => {
      let model: number | null = null
      let draft: string | undefined
      let last = ''
      for (const raw of keys) {
        last = raw
        const result = onEntryDurationKeystroke(raw, (v) => { model = v })
        draft = result.draft
        expect(result.formatError).toBeNull()
        expect(durationFieldDisplay(draft, model)).toBe(raw)
      }
      const blurred = onEntryDurationBlur(last, () => model, (v) => { model = v })
      expect(model).toBe(expectedModel)
      expect(blurred).toEqual({ display: formatted, formatError: null })
    }

    run(['.', '.8'], 0.8, '0.8')
    run(['0', '0.', '0.7'], 0.7, '0.7')
    run(['1', '12', '12.', '12.4'], 12.4, '12.4')
    run(['1', '1:', '1:1', '1:18'], 1.3, '1.3')
  })

  it('shows the format error only for invalid blur, and reverts display to the last good value', () => {
    let model: number | null = 1.3
    expect(onEntryDurationKeystroke('abc', (v) => { model = v })).toEqual({
      draft: 'abc',
      formatError: ENTRY_TIME_FORMAT_ERROR,
    })
    expect(model).toBe(1.3)
    expect(onEntryDurationBlur('abc', () => model, (v) => { model = v })).toEqual({
      display: '1.3',
      formatError: ENTRY_TIME_FORMAT_ERROR,
    })
    expect(model).toBe(1.3)
    expect(onEntryDurationBlur('1:75', () => model, (v) => { model = v }).formatError).toBe(
      ENTRY_TIME_FORMAT_ERROR
    )
    expect(onEntryDurationBlur('-1', () => model, (v) => { model = v }).formatError).toBe(
      ENTRY_TIME_FORMAT_ERROR
    )
  })

  it('commits leftover drafts on save so Enter cannot skip blur', () => {
    const drafts: Record<string, string> = { total: '1.25', pic: '1:18' }
    const model: Record<string, number | null> = { total: 1, pic: 1 }
    const result = commitDurationDrafts(
      drafts,
      (field) => model[field],
      (field, value) => { model[field] = value }
    )
    expect(result.ok).toBe(true)
    expect(model.total).toBe(1.3)
    expect(model.pic).toBe(1.3)
    expect(drafts.total).toBeUndefined()
    expect(drafts.pic).toBeUndefined()
  })

  it('does not silently save invalid leftover drafts', () => {
    const drafts: Record<string, string> = { total: 'abc' }
    const model: Record<string, number | null> = { total: 1.3 }
    const result = commitDurationDrafts(
      drafts,
      (field) => model[field],
      (field, value) => { model[field] = value }
    )
    expect(result.ok).toBe(false)
    expect(result.errors.total).toBe(ENTRY_TIME_FORMAT_ERROR)
    expect(model.total).toBe(1.3)
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
