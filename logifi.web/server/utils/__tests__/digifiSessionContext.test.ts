import { describe, expect, it } from 'vitest'
import {
  formatSessionContextPromptBlock,
  type DigifiSessionPriorPage,
} from '../digifiSessionContext'

const columns = [
  { id: 'col-date', label: 'Date', fieldKey: 'date' as const, order: 0 },
  { id: 'col-id', label: 'ID', fieldKey: 'identification' as const, order: 1 },
  { id: 'col-from', label: 'From', fieldKey: 'departure' as const, order: 2 },
]

describe('formatSessionContextPromptBlock', () => {
  it('returns empty string when no prior pages', () => {
    expect(formatSessionContextPromptBlock([], columns)).toBe('')
  })

  it('summarizes prior page rows for session consistency', () => {
    const prior: DigifiSessionPriorPage[] = [
      {
        pageSide: 'left',
        rows: [
          {
            rowIndex: 0,
            cells: {
              'col-date': '01/15/24',
              'col-id': 'N123AB',
              'col-from': 'KPAO',
            },
          },
        ],
      },
    ]
    const block = formatSessionContextPromptBlock(prior, columns)
    expect(block).toContain('Session so far')
    expect(block).toContain('LEFT page')
    expect(block).toContain('identification=N123AB')
    expect(block).toContain('departure=KPAO')
  })
})
