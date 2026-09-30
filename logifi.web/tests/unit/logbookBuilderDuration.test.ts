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
})
