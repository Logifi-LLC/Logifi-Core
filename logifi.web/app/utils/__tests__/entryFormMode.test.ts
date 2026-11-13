import { describe, expect, it } from 'vitest'
import {
  CATEGORY_CLASS_TIME_HELP,
  DEFAULT_ENTRY_FORM_MODE,
  categoryClassTimeIsIndependent,
  isEntryFormFieldFilled,
  parseEntryFormMode,
  shouldShowAnyEntryFormField,
  shouldShowEntryFormField,
} from '../entryFormMode'
import {
  createEmptyFlightTime,
  createEmptyOOOI,
  createEmptyPerformance,
  type LogEntry,
} from '../logbookTypes'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'entry-1',
    date: '2026-03-12',
    role: 'PIC',
    aircraftCategoryClass: '',
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
    tags: [],
    logbookType: 'flight',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    ...overrides,
  }
}

describe('parseEntryFormMode', () => {
  it('defaults missing or unknown values to Full', () => {
    expect(parseEntryFormMode(undefined)).toBe('full')
    expect(parseEntryFormMode(null)).toBe('full')
    expect(parseEntryFormMode('')).toBe('full')
    expect(parseEntryFormMode('nope')).toBe('full')
    expect(parseEntryFormMode('full')).toBe('full')
    expect(DEFAULT_ENTRY_FORM_MODE).toBe('full')
  })

  it('accepts Quick regardless of case', () => {
    expect(parseEntryFormMode('quick')).toBe('quick')
    expect(parseEntryFormMode('Quick')).toBe('quick')
    expect(parseEntryFormMode(' QUICK ')).toBe('quick')
  })
})

describe('shouldShowEntryFormField', () => {
  it('shows every field in Full', () => {
    const blank = entry({
      aircraftMakeModel: '',
      registration: '',
      departure: '',
      destination: '',
      remarks: '',
    })
    expect(shouldShowEntryFormField({ mode: 'full', field: 'remarks', entry: blank, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'full', field: 'night', entry: blank, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'full', field: 'date', entry: blank, moreFieldsOpen: false })).toBe(true)
  })

  it('shows core Quick fields even when empty', () => {
    const blank = entry({
      date: '',
      role: '',
      aircraftMakeModel: '',
      registration: '',
      departure: '',
      destination: '',
      flightTime: createEmptyFlightTime(),
      performance: createEmptyPerformance(),
    })
    for (const field of ['date', 'role', 'aircraftMakeModel', 'registration', 'departure', 'destination', 'total', 'dayLandings', 'nightLandings'] as const) {
      expect(shouldShowEntryFormField({ mode: 'quick', field, entry: blank, moreFieldsOpen: false })).toBe(true)
    }
  })

  it('hides empty extras in Quick until More fields is open', () => {
    const blank = entry()
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'night', entry: blank, moreFieldsOpen: false })).toBe(false)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'remarks', entry: blank, moreFieldsOpen: false })).toBe(false)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'approaches', entry: blank, moreFieldsOpen: false })).toBe(false)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'flightNumber', entry: blank, moreFieldsOpen: false })).toBe(false)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'night', entry: blank, moreFieldsOpen: true })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'remarks', entry: blank, moreFieldsOpen: true })).toBe(true)
  })

  it('never hides a filled extra in Quick', () => {
    const filled = entry({
      remarks: 'Night landing to a full stop',
      flightTime: { ...createEmptyFlightTime(), night: 0.4, total: 1.3 },
      flightConditions: ['Night'],
      tags: ['IPC'],
      performance: {
        ...createEmptyPerformance(),
        holdingProcedures: 1,
        approaches: [{ type: 'ILS', count: 1 }],
      },
      route: 'JOT',
      flightNumber: 'AA123',
    })
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'night', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'remarks', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'approaches', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'holdingProcedures', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'flightConditions', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'tags', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'route', entry: filled, moreFieldsOpen: false })).toBe(true)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'flightNumber', entry: filled, moreFieldsOpen: false })).toBe(true)
  })

  it('does not treat whitespace-only extras as filled', () => {
    const padded = entry({ remarks: '   ', route: ' ', flightNumber: '\t' })
    expect(isEntryFormFieldFilled(padded, 'remarks')).toBe(false)
    expect(shouldShowEntryFormField({ mode: 'quick', field: 'remarks', entry: padded, moreFieldsOpen: false })).toBe(false)
  })

  it('keeps Category/Class time hidden when it only mirrors Total Time', () => {
    const mirrored = entry({
      categoryClassTime: 1.3,
      flightTime: { ...createEmptyFlightTime(), total: 1.3 },
    })
    expect(categoryClassTimeIsIndependent(mirrored)).toBe(false)
    expect(shouldShowEntryFormField({
      mode: 'quick',
      field: 'categoryClassTime',
      entry: mirrored,
      moreFieldsOpen: false,
    })).toBe(false)

    const overridden = entry({
      categoryClassTime: 0.8,
      flightTime: { ...createEmptyFlightTime(), total: 1.3 },
    })
    expect(categoryClassTimeIsIndependent(overridden)).toBe(true)
    expect(shouldShowEntryFormField({
      mode: 'quick',
      field: 'categoryClassTime',
      entry: overridden,
      moreFieldsOpen: false,
    })).toBe(true)
  })

  it('does not mutate the entry when deciding visibility', () => {
    const source = entry({
      remarks: 'Keep me',
      flightTime: { ...createEmptyFlightTime(), night: 0.5, total: 1.2 },
      categoryClassTime: 1.2,
    })
    const before = JSON.stringify(source)
    shouldShowEntryFormField({ mode: 'quick', field: 'night', entry: source, moreFieldsOpen: false })
    shouldShowEntryFormField({ mode: 'full', field: 'remarks', entry: source, moreFieldsOpen: false })
    expect(JSON.stringify(source)).toBe(before)
  })

  it('shows a section when any listed extra is filled', () => {
    const filled = entry({ flightTime: { ...createEmptyFlightTime(), pic: 1.1 } })
    expect(shouldShowAnyEntryFormField({
      mode: 'quick',
      fields: ['pic', 'sic', 'night'],
      entry: filled,
      moreFieldsOpen: false,
    })).toBe(true)
    expect(shouldShowAnyEntryFormField({
      mode: 'quick',
      fields: ['sic', 'night'],
      entry: filled,
      moreFieldsOpen: false,
    })).toBe(false)
  })
})

describe('CATEGORY_CLASS_TIME_HELP', () => {
  it('explains the auto-copy without sounding like a second total', () => {
    expect(CATEGORY_CLASS_TIME_HELP).toBe('Copied from Total Time; change only if different')
  })
})
