import { describe, expect, it } from 'vitest'
import {
  digifiRowTimeMismatchMap,
  findDigifiRowTimeMismatches,
  type DigifiRowTimeColumn,
} from '../../app/utils/digifiRowTimeMismatch'

const studentColumns: DigifiRowTimeColumn[] = [
  { id: 'total', fieldKey: 'total', label: 'Total' },
  { id: 'asel', fieldKey: 'categoryClass', label: 'ASEL', categoryClassValue: 'ASEL' },
  { id: 'pic', fieldKey: 'pic', label: 'PIC' },
  { id: 'dualg', fieldKey: 'dualG', label: 'Dual G' },
  { id: 'sic', fieldKey: 'sic', label: 'SIC' },
  { id: 'night', fieldKey: 'night', label: 'Night' },
  { id: 'solo', fieldKey: 'solo', label: 'Solo' },
]

function flaggedIds(cells: Record<string, string>, columns: DigifiRowTimeColumn[] = studentColumns) {
  return findDigifiRowTimeMismatches(cells, columns).map((flag) => flag.columnId)
}

describe('findDigifiRowTimeMismatches', () => {
  it('flags Total and role cells when PIC or Dual Given is above Total', () => {
    const cells = { total: '1.6', asel: '1.6', pic: '1.8', dualg: '1.8' }
    const flags = findDigifiRowTimeMismatches(cells, studentColumns)
    expect(flaggedIds(cells)).toEqual(['total', 'pic', 'dualg'])
    expect(flags[0]?.message).toBe('PIC 1.8 and Dual G 1.8 are greater than Total 1.6')
    expect(flags.every((flag) => flag.message === flags[0]?.message)).toBe(true)
    expect(cells).toEqual({ total: '1.6', asel: '1.6', pic: '1.8', dualg: '1.8' })
  })

  it('clears when Total is edited to match the role times', () => {
    expect(flaggedIds({ total: '1.8', asel: '1.8', pic: '1.8', dualg: '1.8' })).toEqual([])
  })

  it('does not flag a role time at or under Total, or a blank role cell', () => {
    expect(flaggedIds({ total: '1.6', pic: '1.4', dualg: '' })).toEqual([])
    expect(flaggedIds({ total: '1.6', pic: '1.6', dualg: '1.64' })).toEqual([])
    expect(flaggedIds({ total: '1.6', pic: '0', dualg: '0.0' })).toEqual([])
  })

  it('skips the row when Total is blank or zero', () => {
    expect(flaggedIds({ total: '', pic: '1.8', dualg: '1.8' })).toEqual([])
    expect(flaggedIds({ total: '0', pic: '1.8' })).toEqual([])
    expect(flaggedIds({ pic: '1.8' }, [{ id: 'pic', fieldKey: 'pic', label: 'PIC' }])).toEqual([])
  })

  it('flags Dual Received only when that column is on the scan', () => {
    const withDualR: DigifiRowTimeColumn[] = [
      ...studentColumns,
      { id: 'dualr', fieldKey: 'dualR', label: 'Dual R' },
    ]
    expect(flaggedIds({ total: '1.6', dualr: '1.8' }, withDualR)).toEqual(['total', 'dualr'])
    expect(flaggedIds({ total: '1.6', dualr: '1.8' })).toEqual([])
  })

  it('flags a category time column that differs from Total when the scan has it', () => {
    const flags = findDigifiRowTimeMismatches(
      { total: '1.6', asel: '1.4', pic: '1.6' },
      studentColumns
    )
    expect(flags.map((flag) => flag.columnId)).toEqual(['total', 'asel'])
    expect(flags[0]?.message).toBe("ASEL 1.4 doesn't match Total 1.6")
  })

  it('does not invent an ASEL check when the scan has no category column', () => {
    const columns = studentColumns.filter((column) => column.id !== 'asel')
    expect(flaggedIds({ total: '1.6', asel: '1.9', pic: '1.6' }, columns)).toEqual([])
  })

  it('does not flag night, solo, or other non-role columns that exceed Total', () => {
    expect(flaggedIds({ total: '1.6', night: '3.0', solo: '2.0', pic: '1.6' })).toEqual([])
  })

  it('reads H:MM with the import duration parser', () => {
    expect(flaggedIds({ total: '1:36', pic: '1:48', asel: '1:36' })).toEqual(['total', 'pic'])
    expect(flaggedIds({ total: '1:36', pic: '1:38', asel: '1:36' })).toEqual([])
    const flags = findDigifiRowTimeMismatches({ total: '1:36', pic: '1:48' }, studentColumns)
    expect(flags[0]?.message).toBe('PIC 1:48 is greater than Total 1:36')
  })

  it('warns when Day + Night does not match Total and leaves the cells unchanged', () => {
    const columns: DigifiRowTimeColumn[] = [
      ...studentColumns,
      { id: 'day', fieldKey: null, label: 'Day', columnKind: 'day' },
    ]
    const cells = { total: '1.5', day: '1.2', night: '0.4', pic: '1.5' }
    const flags = findDigifiRowTimeMismatches(cells, columns)
    expect(flags.map((flag) => flag.columnId)).toEqual(['total', 'day', 'night'])
    expect(flags[0]?.message).toBe("Day 1.2 + Night 0.4 doesn't match Total 1.5")
    expect(cells).toEqual({ total: '1.5', day: '1.2', night: '0.4', pic: '1.5' })
  })

  it('does not warn when Day + Night matches Total, or when Night is blank and Day fits', () => {
    const columns: DigifiRowTimeColumn[] = [
      ...studentColumns,
      { id: 'day', fieldKey: null, label: 'Day', columnKind: 'day' },
    ]
    expect(flaggedIds({ total: '1.5', day: '1.2', night: '0.3' }, columns)).toEqual([])
    expect(flaggedIds({ total: '1.5', day: '1.2', night: '' }, columns)).toEqual([])
    expect(flaggedIds({ total: '1:36', day: '1:36', night: '0:02' }, columns)).toEqual([])
  })

  it('warns when Day is greater than Total and Night is blank', () => {
    const columns: DigifiRowTimeColumn[] = [
      ...studentColumns,
      { id: 'day', fieldKey: null, label: 'Day', columnKind: 'day' },
    ]
    const flags = findDigifiRowTimeMismatches({ total: '1.5', day: '2.0', night: '' }, columns)
    expect(flags.map((flag) => flag.columnId)).toEqual(['total', 'day'])
    expect(flags[0]?.message).toBe('Day 2.0 is greater than Total 1.5')
  })

  it('does not treat a custom column time as a total check', () => {
    const columns: DigifiRowTimeColumn[] = [
      ...studentColumns,
      { id: 'gear', fieldKey: null, label: 'Retractable Gear', columnKind: 'custom' },
    ]
    expect(flaggedIds({ total: '1.5', gear: '5.0', pic: '1.5' }, columns)).toEqual([])
  })

  it('maps flags by row so a matching edit drops that row only', () => {
    const map = digifiRowTimeMismatchMap(
      [
        { cells: { total: '1.2', pic: '1.2', asel: '1.2' } },
        { cells: { total: '1.6', pic: '1.8', asel: '1.6' } },
      ],
      studentColumns
    )
    expect(map.get('1:total')).toMatch(/PIC 1\.8/)
    expect(map.get('1:pic')).toBe(map.get('1:total'))
    expect(map.has('0:total')).toBe(false)
    expect(map.has('1:asel')).toBe(false)
  })
})
