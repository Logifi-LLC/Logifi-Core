import { describe, it, expect } from 'vitest'
import {
  buildPageSpecificRules,
  buildRowBandLabel,
  buildScanPrompt,
} from '../../server/utils/digifiPrompt'
import type { DigifiScanMetaInput } from '../../server/utils/digifiSchema'

const baseMeta: DigifiScanMetaInput = {
  spreadId: '00000000-0000-4000-8000-000000000001',
  pageSide: 'right',
  layout: 'two-page',
  rowCount: 13,
  twoPageSplitIndex: 2,
  defaultYear: 2024,
  columns: [
    { id: 'date', label: 'Date', fieldKey: 'date', order: 0 },
    { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
    { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
  ],
}

describe('buildPageSpecificRules', () => {
  it('includes totals and remarks rules for all pages', () => {
    const rules = buildPageSpecificRules(baseMeta, [
      { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
      { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
    ])
    expect(rules).toContain('Brought Forward')
    expect(rules).toContain('Never merge remarks from two different flight lines')
    expect(rules).toContain('horizontal ruled lines')
    expect(rules).toContain('rowCount is flight lines only')
    expect(rules).toContain('Adjacent rows with the same total or PIC time')
    expect(rules).toContain('three 1.3 lines')
  })

  it('adds two-page right column guidance', () => {
    const rules = buildPageSpecificRules(baseMeta, [
      { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
      { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
    ])
    expect(rules).toContain('Two-page RIGHT page')
    expect(rules).toContain('pic, remarks')
    expect(rules).toContain('rowIndex 0 through 12')
    expect(rules).toContain('Do not invent date or aircraft')
  })
})

describe('buildScanPrompt', () => {
  it('embeds page-specific totals rules in full prompt', () => {
    const prompt = buildScanPrompt(
      baseMeta,
      [
        { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
        { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
      ],
      { includeRowBands: false, chunkImages: [] }
    )
    expect(prompt).toContain('RIGHT page of a two-page spread')
    expect(prompt).toContain('Totals and footer rows')
    expect(prompt).toContain('Extract rowIndex 0 through 12')
    expect(prompt).toContain('Identical duration values across consecutive lines')
    expect(prompt).toContain('keep a distinct rowIndex for each ruled band')
  })

  it('includes remarks-focused band hint when row bands and remarks column present', () => {
    const prompt = buildScanPrompt(
      baseMeta,
      [
        { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
        { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
      ],
      { includeRowBands: true, chunkImages: [{ rowStart: 0, rowEnd: 4 }] }
    )
    expect(prompt).toContain('zoomed to the remarks column')
    expect(prompt).toContain('horizontal ruled lines as hard row boundaries')
  })
})

describe('buildRowBandLabel', () => {
  it('adds remarks boundary hint when remarks focus is enabled', () => {
    expect(buildRowBandLabel(2, 5, true)).toContain('remarks only')
    expect(buildRowBandLabel(2, 5, true)).toContain('ruled line')
    expect(buildRowBandLabel(2, 5, false)).toBe('Row band rows 2-5:')
  })
})
