import { describe, expect, it } from 'vitest'
import { gridToEntries } from '../../app/composables/useLogbookBuilderImport'
import {
  customColumnCellCountsAsTag,
  userTagPresetsToCreate,
} from '../../app/utils/digifiDayAndCustomColumns'
import { columnsToTemplateColumns } from '../../app/utils/logbookBuilderDraft'
import type { BuilderColumn, BuilderRow } from '../../app/utils/logbookBuilderTypes'

const columns: BuilderColumn[] = [
  { id: 'date', fieldKey: 'date', label: 'Date', order: 0 },
  { id: 'asel', fieldKey: 'categoryClass', label: 'ASEL', order: 1, categoryClassValue: 'ASEL' },
  { id: 'gear', fieldKey: null, label: 'Retractable Gear', order: 2, columnKind: 'custom' },
  { id: 'complex', fieldKey: null, label: 'Complex', order: 3, columnKind: 'custom' },
  { id: 'day', fieldKey: null, label: 'Day', order: 4, columnKind: 'day' },
  { id: 'night', fieldKey: 'night', label: 'Night', order: 5 },
  { id: 'total', fieldKey: 'total', label: 'Total', order: 6 },
  { id: 'notes', fieldKey: null, label: 'Notes', order: 7 },
]

function entryFrom(cells: Record<string, string>, tags?: string[]) {
  const rows: BuilderRow[] = [{ cells, tags }]
  return gridToEntries({ columns, rows, defaultYear: 2024 })[0]
}

describe('Day column on import', () => {
  it('derives Night from Total − Day when Night is blank', () => {
    const entry = entryFrom({
      date: '2024-06-13',
      day: '1.2',
      night: '',
      total: '1.5',
    })
    expect(entry?.flightTime.night).toBe(0.3)
    expect(entry?.flightTime.total).toBe(1.5)
    expect(entry?.flightTime).not.toHaveProperty('day')
  })

  it('derives Night from H:MM Day and Total', () => {
    const entry = entryFrom({
      date: '2024-06-13',
      day: '1:12',
      total: '1:30',
    })
    expect(entry?.flightTime.night).toBe(0.3)
  })

  it('does not overwrite a filled Night, even when Day + Night disagrees with Total', () => {
    const entry = entryFrom({
      date: '2024-06-13',
      day: '1.2',
      night: '0.4',
      total: '1.5',
    })
    expect(entry?.flightTime.night).toBe(0.4)
    expect(entry?.flightTime.total).toBe(1.5)
  })

  it('does not store a negative night when Day is greater than Total', () => {
    const entry = entryFrom({
      date: '2024-06-13',
      day: '2.0',
      night: '',
      total: '1.5',
    })
    expect(entry?.flightTime.night).toBeNull()
  })
})

describe('custom columns become tags on import', () => {
  it('tags a positive time and a checkmark, and skips 0.0', () => {
    expect(customColumnCellCountsAsTag('0.0')).toBe(false)
    expect(customColumnCellCountsAsTag('0')).toBe(false)
    expect(customColumnCellCountsAsTag('')).toBe(false)
    expect(customColumnCellCountsAsTag('1.2')).toBe(true)
    expect(customColumnCellCountsAsTag('✓')).toBe(true)
    expect(customColumnCellCountsAsTag('X')).toBe(true)

    const zero = entryFrom({ date: '2024-06-13', gear: '0.0', total: '1.2' })
    expect(zero?.tags).toEqual([])
    expect(zero?.flightTime.total).toBe(1.2)

    const time = entryFrom({ date: '2024-06-13', gear: '1.2', total: '1.5' })
    expect(time?.tags).toEqual(['Retractable Gear'])
    expect(time?.flightTime.total).toBe(1.5)
    expect(time?.flightTime).not.toHaveProperty('retractableGear')

    const check = entryFrom({ date: '2024-06-13', gear: '✓', complex: 'X', total: '1.0' })
    expect(check?.tags).toEqual(['Retractable Gear', 'Complex'])
  })

  it('does not tag an unmapped notes column, and keeps a tag the pilot already added', () => {
    const entry = entryFrom(
      { date: '2024-06-13', notes: '1.2', gear: '1.0', total: '1.2' },
      ['IPC']
    )
    expect(entry?.tags).toEqual(['IPC', 'Retractable Gear'])
  })

  it('creates a user tag preset name for a new custom title and skips built-in presets', () => {
    expect(userTagPresetsToCreate(['Retractable Gear', 'IPC', '  ', 'Retractable Gear'])).toEqual([
      'Retractable Gear',
    ])
  })

  it('saves custom columns on a template with the other columns', () => {
    const stored = columnsToTemplateColumns(columns)
    expect(stored.find((column) => column.id === 'gear')).toMatchObject({
      fieldKey: null,
      label: 'Retractable Gear',
      order: 2,
      columnKind: 'custom',
    })
    expect(stored.find((column) => column.id === 'day')).toMatchObject({
      label: 'Day',
      columnKind: 'day',
    })
    expect(stored.map((column) => column.label)).toEqual(columns.map((column) => column.label))
  })
})
