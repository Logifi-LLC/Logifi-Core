import { describe, expect, it } from 'vitest'
import { gridToEntries } from '../../app/composables/useLogbookBuilderImport'
import type { BuilderColumn, BuilderRow } from '../../app/utils/logbookBuilderTypes'

describe('logbook builder import durations', () => {
  it('parses H:MM flight time and leaves landing counts whole', () => {
    const columns: BuilderColumn[] = [
      { id: 'date', fieldKey: 'date', label: 'Date', order: 0 },
      { id: 'ident', fieldKey: 'identification', label: 'Ident', order: 1 },
      { id: 'from', fieldKey: 'departure', label: 'From', order: 2 },
      { id: 'to', fieldKey: 'destination', label: 'To', order: 3 },
      { id: 'total', fieldKey: 'total', label: 'Total', order: 4 },
      { id: 'pic', fieldKey: 'pic', label: 'PIC', order: 5 },
      { id: 'ldg', fieldKey: 'dayLandings', label: 'Day Ldg', order: 6 },
    ]
    const rows: BuilderRow[] = [
      {
        cells: {
          date: '2024-06-13',
          ident: 'N172SP',
          from: 'KIND',
          to: 'KORD',
          total: '0:48',
          pic: '1:17',
          ldg: '2',
        },
      },
    ]

    const [entry] = gridToEntries({ columns, rows })
    expect(entry?.flightTime.total).toBe(0.8)
    expect(entry?.flightTime.pic).toBe(1.3)
    expect(entry?.performance.dayLandings).toBe(2)
  })

  it('keeps the rolled year after a Dec→Jan rollover on a locked page', () => {
    const columns: BuilderColumn[] = [
      { id: 'date', fieldKey: 'date', label: 'Date', order: 0 },
      { id: 'total', fieldKey: 'total', label: 'Total', order: 1 },
    ]
    const rows: BuilderRow[] = ['12/28', '1/31', '2/1', '2/5'].map((date) => ({
      cells: { date, total: '1.0' },
    }))

    const dates = gridToEntries({ columns, rows, defaultYear: 2023 }).map((e) => e.date)
    expect(dates).toEqual(['2023-12-28', '2024-01-31', '2024-02-01', '2024-02-05'])
  })
})

