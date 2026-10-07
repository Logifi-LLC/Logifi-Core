import { describe, it, expect } from 'vitest'
import {
  buildPageSpecificRules,
  buildRowBandLabel,
  buildScanPrompt,
  buildTargetColumns,
} from '../../server/utils/digifiPrompt'
import { digifiScanMetaSchema, type DigifiScanMetaInput } from '../../server/utils/digifiSchema'

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
    expect(rules).toContain('Do not move any of it into Pilots')
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

  it('embeds session context from earlier spread pages when provided', () => {
    const prompt = buildScanPrompt(
      baseMeta,
      [
        { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
        { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
      ],
      {
        includeRowBands: false,
        chunkImages: [],
        sessionPriorPages: [
          {
            pageSide: 'left',
            rows: [
              {
                rowIndex: 0,
                cells: { date: '02/01/24', pic: '1.2' },
              },
            ],
          },
        ],
      }
    )
    expect(prompt).toContain('Session so far')
    expect(prompt).toContain('LEFT page')
    expect(prompt).toContain('date=02/01/24')
  })

  it('embeds few-shot correction pairs when provided', () => {
    const prompt = buildScanPrompt(
      baseMeta,
      [
        { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 1 },
        { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
      ],
      {
        includeRowBands: false,
        chunkImages: [],
        fewShotExamples: [
          {
            fieldKey: 'identification',
            rawValue: 'N12SAB',
            correctedValue: 'N123AB',
            sampleCount: 4,
            lastCorrectedAt: '2026-05-01T00:00:00Z',
          },
        ],
      }
    )
    expect(prompt).toContain('Pilot correction examples')
    expect(prompt).toContain('identification: "N12SAB" → "N123AB"')
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

describe('custom and day columns in the scan prompt', () => {
  it('includes custom column titles in page order and tells the model not to mix them into neighbors', () => {
    const parsed = digifiScanMetaSchema.parse({
      ...baseMeta,
      pageSide: 'right',
      layout: 'single',
      twoPageSplitIndex: 1,
      columns: [
        { id: 'asel', label: 'ASEL', fieldKey: 'categoryClass', order: 0, categoryClassValue: 'ASEL' },
        { id: 'gear', label: 'Retractable Gear', fieldKey: null, order: 1, columnKind: 'custom' },
        { id: 'complex', label: 'Complex', fieldKey: null, order: 2, columnKind: 'custom' },
        { id: 'hp', label: 'High Perf', fieldKey: null, order: 3, columnKind: 'custom' },
      ],
    })
    const targets = buildTargetColumns(parsed)
    expect(targets.map((column) => column.label)).toEqual([
      'ASEL',
      'Retractable Gear',
      'Complex',
      'High Perf',
    ])
    const prompt = buildScanPrompt(parsed, targets, { includeRowBands: false, chunkImages: [] })
    const gearAt = prompt.indexOf('Retractable Gear')
    const complexAt = prompt.indexOf('Complex')
    const highPerfAt = prompt.indexOf('High Perf')
    expect(gearAt).toBeGreaterThan(-1)
    expect(gearAt).toBeLessThan(complexAt)
    expect(complexAt).toBeLessThan(highPerfAt)
    expect(prompt).toContain('do not mix it into a neighbor such as ASEL')
    expect(prompt).toContain('sits between "ASEL" and "Complex"')
    expect(prompt).toContain('sits between "Retractable Gear" and "High Perf"')
    expect(prompt).toContain('sits between "Complex" and "the right edge"')
  })

  it('describes Day as daytime hours, separate from Night and day landings', () => {
    const columns = [
      { id: 'day', label: 'Day', fieldKey: null, order: 0, columnKind: 'day' as const },
      { id: 'night', label: 'Night', fieldKey: 'night' as const, order: 1 },
      { id: 'total', label: 'Total', fieldKey: 'total' as const, order: 2 },
    ]
    const prompt = buildScanPrompt(
      { ...baseMeta, pageSide: 'left', layout: 'single', columns },
      columns,
      { includeRowBands: false, chunkImages: [] }
    )
    expect(prompt).toContain('Day time: columnId day ("Day")')
    expect(prompt).toContain('not Night and not Day Landings')
    expect(prompt).toContain('decimal time (daytime hours; not Night and not day landings)')
  })
})

describe('buildRowBandLabel', () => {
  it('adds remarks boundary hint when remarks focus is enabled', () => {
    expect(buildRowBandLabel(2, 5, true)).toContain('remarks only')
    expect(buildRowBandLabel(2, 5, true)).toContain('ruled line')
    expect(buildRowBandLabel(2, 5, false)).toBe('Row band rows 2-5:')
  })
})
