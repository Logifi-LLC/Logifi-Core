import { describe, expect, it } from 'vitest'
import {
  buildDigifiColumnCorrectionCounts,
  sanitizeDigifiColumnCorrectionCounts,
} from '../digifiColumnCorrectionCounts'

describe('buildDigifiColumnCorrectionCounts', () => {
  it('counts edits where the pilot changed the AI-resolved value', () => {
    const counts = buildDigifiColumnCorrectionCounts(
      [
        {
          cells: { c1: 'N12345', c2: '01/02/24' },
          digifiCellMeta: {
            c1: { fieldKey: 'registration', resolvedValue: 'N1234' },
            c2: { fieldKey: 'date', resolvedValue: '01/02/24' },
          },
        },
        {
          cells: { c1: 'N99999' },
          digifiCellMeta: {
            c1: { fieldKey: 'registration', resolvedValue: 'N9999' },
          },
        },
      ],
      [{ id: 'c1', fieldKey: 'registration' }, { id: 'c2', fieldKey: 'date' }]
    )

    expect(counts).toEqual({ registration: 2 })
  })

  it('does not include cell values in the output', () => {
    const counts = buildDigifiColumnCorrectionCounts(
      [
        {
          cells: { c1: 'secret-pilot-name' },
          digifiCellMeta: {
            c1: { fieldKey: 'remarks', resolvedValue: 'ai text' },
          },
        },
      ],
      [{ id: 'c1', fieldKey: 'remarks' }]
    )
    expect(Object.keys(counts)).toEqual(['remarks'])
    expect(JSON.stringify(counts)).not.toContain('secret')
  })
})

describe('sanitizeDigifiColumnCorrectionCounts', () => {
  it('drops invalid keys and non-integers', () => {
    expect(
      sanitizeDigifiColumnCorrectionCounts({
        date: 2,
        'not valid': 1,
        registration: 1.5,
        route: -1,
      })
    ).toEqual({ date: 2 })
  })
})
