import { describe, it, expect } from 'vitest'
import { buildColumnList, filterDigifiScanColumns } from '../../server/utils/digifiPrompt'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'

function col(id: string, fieldKey: DigifiTemplateColumn['fieldKey'], order: number): DigifiTemplateColumn {
  return { id, label: id, fieldKey, order }
}

describe('filterDigifiScanColumns', () => {
  it('excludes role and pilotRole from scan columns', () => {
    const columns = [
      col('c-date', 'date', 0),
      col('c-role', 'role', 1),
      col('c-pilot-role', 'pilotRole', 2),
      col('c-pic', 'pic', 3),
    ]
    const filtered = filterDigifiScanColumns(buildColumnList(columns, 'left', 'single', 2))
    expect(filtered.map((c) => c.fieldKey)).toEqual(['date', 'pic'])
    expect(filtered.some((c) => c.id === 'c-role')).toBe(false)
    expect(filtered.some((c) => c.id === 'c-pilot-role')).toBe(false)
  })
})
