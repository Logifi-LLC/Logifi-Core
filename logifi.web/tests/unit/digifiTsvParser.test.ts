import { describe, it, expect } from 'vitest'
import { parseDigifiTsvResponse, stripGeminiTextFences } from '../../server/utils/digifiTsvParser'

const allowed = new Set(['c1', 'c2'])

describe('stripGeminiTextFences', () => {
  it('strips markdown fences', () => {
    expect(stripGeminiTextFences('```\n0\tc1\tKORD\n```')).toBe('0\tc1\tKORD')
  })
})

describe('parseDigifiTsvResponse', () => {
  it('parses sparse cell lines', () => {
    const rows = parseDigifiTsvResponse(
      '0\tc1\tKORD\n0\tc2\t1.2\n1\tc1\tKLAF',
      allowed,
      10
    )
    expect(rows).toEqual([
      { rowIndex: 0, cells: { c1: 'KORD', c2: '1.2' } },
      { rowIndex: 1, cells: { c1: 'KLAF' } },
    ])
  })

  it('ignores unknown column ids and out-of-range rows', () => {
    const rows = parseDigifiTsvResponse(
      '0\tbad\tX\n99\tc1\tY\n0\tc1\tOK',
      allowed,
      5
    )
    expect(rows).toEqual([{ rowIndex: 0, cells: { c1: 'OK' } }])
  })

  it('filters to focus rows when provided', () => {
    const rows = parseDigifiTsvResponse(
      '0\tc1\tA\n2\tc1\tB',
      allowed,
      10,
      new Set([2])
    )
    expect(rows).toEqual([{ rowIndex: 2, cells: { c1: 'B' } }])
  })
})
