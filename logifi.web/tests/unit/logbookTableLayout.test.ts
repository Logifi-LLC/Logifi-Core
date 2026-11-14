import { describe, expect, it } from 'vitest'
import type { LogbookColumnConfig } from '../../app/utils/logbookTypes'
import {
  applyLogbookTableDensity,
  resolveLogbookTableDensity,
} from '../../app/utils/logbookTableLayout'

const cols: LogbookColumnConfig[] = [
  { key: 'date', label: 'Date', visible: true, order: 0, required: true },
  { key: 'conditions', label: 'Conditions', visible: true, order: 1, required: false },
  { key: 'identification', label: 'ID', visible: true, order: 2, required: false },
  { key: 'remarks', label: 'Remarks', visible: true, order: 3, required: false, responsiveClass: 'hidden lg:table-cell' },
]

describe('logbookTableLayout', () => {
  it('picks density from viewport flags', () => {
    expect(resolveLogbookTableDensity(false, false)).toBe('full')
    expect(resolveLogbookTableDensity(true, false)).toBe('condensed')
    expect(resolveLogbookTableDensity(true, true)).toBe('tight')
  })

  it('hides non-essential columns before horizontal scroll', () => {
    const condensed = applyLogbookTableDensity(cols, 'condensed')
    expect(condensed.find((c) => c.key === 'conditions')?.responsiveClass).toContain('hidden')
    const tight = applyLogbookTableDensity(cols, 'tight')
    expect(tight.find((c) => c.key === 'identification')?.responsiveClass).toContain('hidden')
  })
})
