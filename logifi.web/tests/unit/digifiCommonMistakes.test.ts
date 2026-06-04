import { describe, it, expect } from 'vitest'
import {
  applyDigifiVerifyCarefullyFlags,
  columnsForDigifiPageSide,
  countDigifiVerifyCarefullyCells,
  formatDigifiVerifyCarefullyWarning,
} from '../../app/utils/digifiCommonMistakes'
import type { BuilderColumn, BuilderRow } from '../../app/utils/logbookBuilderTypes'
import { createBuilderColumn, createEmptyBuilderRow } from '../../app/utils/logbookBuilderTypes'
import type { DigifiScanCellMeta } from '../../app/utils/digifiTypes'

function baseMeta(fieldKey: DigifiScanCellMeta['fieldKey'], overrides: Partial<DigifiScanCellMeta> = {}): DigifiScanCellMeta {
  return {
    fieldKey,
    rawValue: '1',
    resolvedValue: '1',
    strategy: 'raw',
    confidence: 'low',
    autoApplied: false,
    needsReview: false,
    ...overrides,
  }
}

describe('digifiCommonMistakes', () => {
  it('flags route and landing cells after scan', () => {
    const fromCol = createBuilderColumn({ fieldKey: 'departure', label: 'From', order: 0 })
    const landCol = createBuilderColumn({ fieldKey: 'dayLandings', label: 'Day', order: 1 })
    const row: BuilderRow = {
      cells: { [fromCol.id]: 'KORD', [landCol.id]: '3' },
      digifiCellMeta: {
        [fromCol.id]: baseMeta('departure'),
        [landCol.id]: baseMeta('dayLandings'),
      },
    }

    const count = applyDigifiVerifyCarefullyFlags({
      rows: [row],
      columns: [fromCol, landCol],
      pageSide: 'left',
      layout: 'single',
      splitIndex: 1,
      baseRow: 0,
      scanRowIndices: [0],
      allowedColumnIds: new Set([fromCol.id, landCol.id]),
    })

    expect(count).toBe(2)
    expect(row.digifiCellMeta?.[fromCol.id]?.verifyCarefully).toBe(true)
    expect(row.digifiCellMeta?.[landCol.id]?.verifyCarefully).toBe(true)
  })

  it('flags dual columns only when both exist on the page', () => {
    const dualG = createBuilderColumn({ fieldKey: 'dualG', label: 'Dual G', order: 0 })
    const dualR = createBuilderColumn({ fieldKey: 'dualR', label: 'Dual R', order: 1 })
    const rowBoth: BuilderRow = {
      cells: { [dualG.id]: '1.0', [dualR.id]: '0.5' },
      digifiCellMeta: {
        [dualG.id]: baseMeta('dualG'),
        [dualR.id]: baseMeta('dualR'),
      },
    }

    const flaggedBoth = applyDigifiVerifyCarefullyFlags({
      rows: [rowBoth],
      columns: [dualG, dualR],
      pageSide: 'left',
      layout: 'single',
      splitIndex: 1,
      baseRow: 0,
      scanRowIndices: [0],
      allowedColumnIds: new Set([dualG.id, dualR.id]),
    })
    expect(flaggedBoth).toBe(2)

    const rowSingle = createEmptyBuilderRow([dualG.id])
    rowSingle.cells[dualG.id] = '1.0'
    rowSingle.digifiCellMeta = { [dualG.id]: baseMeta('dualG') }

    const flaggedSingle = applyDigifiVerifyCarefullyFlags({
      rows: [rowSingle],
      columns: [dualG],
      pageSide: 'left',
      layout: 'single',
      splitIndex: 1,
      baseRow: 0,
      scanRowIndices: [0],
      allowedColumnIds: new Set([dualG.id]),
    })
    expect(flaggedSingle).toBe(0)
    expect(rowSingle.digifiCellMeta?.[dualG.id]?.verifyCarefully).toBeUndefined()
  })

  it('does not override identification needsReview', () => {
    const idCol = createBuilderColumn({ fieldKey: 'identification', label: 'ID', order: 0 })
    const fromCol = createBuilderColumn({ fieldKey: 'departure', label: 'From', order: 1 })
    const row: BuilderRow = {
      cells: { [idCol.id]: 'N123', [fromCol.id]: 'KORD' },
      digifiCellMeta: {
        [idCol.id]: baseMeta('identification', { needsReview: true }),
        [fromCol.id]: baseMeta('departure'),
      },
    }

    applyDigifiVerifyCarefullyFlags({
      rows: [row],
      columns: [idCol, fromCol],
      pageSide: 'left',
      layout: 'single',
      splitIndex: 1,
      baseRow: 0,
      scanRowIndices: [0],
      allowedColumnIds: new Set([idCol.id, fromCol.id]),
    })

    expect(row.digifiCellMeta?.[idCol.id]?.needsReview).toBe(true)
    expect(row.digifiCellMeta?.[idCol.id]?.verifyCarefully).toBeUndefined()
    expect(row.digifiCellMeta?.[fromCol.id]?.verifyCarefully).toBe(true)
  })

  it('limits flags to scanned page columns in two-page layout', () => {
    const leftCol = createBuilderColumn({ fieldKey: 'departure', label: 'From', order: 0 })
    const rightCol = createBuilderColumn({ fieldKey: 'destination', label: 'To', order: 1 })
    const row: BuilderRow = {
      cells: { [leftCol.id]: 'KORD', [rightCol.id]: 'KMDW' },
      digifiCellMeta: {
        [leftCol.id]: baseMeta('departure'),
        [rightCol.id]: baseMeta('destination'),
      },
    }

    const leftOnly = applyDigifiVerifyCarefullyFlags({
      rows: [row],
      columns: [leftCol, rightCol],
      pageSide: 'left',
      layout: 'two-page',
      splitIndex: 1,
      baseRow: 0,
      scanRowIndices: [0],
      allowedColumnIds: new Set([leftCol.id]),
    })

    expect(leftOnly).toBe(1)
    expect(row.digifiCellMeta?.[leftCol.id]?.verifyCarefully).toBe(true)
    expect(row.digifiCellMeta?.[rightCol.id]?.verifyCarefully).toBeUndefined()
  })

  it('columnsForDigifiPageSide splits two-page columns', () => {
    const a = createBuilderColumn({ fieldKey: 'departure', order: 0 })
    const b = createBuilderColumn({ fieldKey: 'destination', order: 1 })
    expect(columnsForDigifiPageSide([a, b], 'left', 'two-page', 1).map((c) => c.id)).toEqual([a.id])
    expect(columnsForDigifiPageSide([a, b], 'right', 'two-page', 1).map((c) => c.id)).toEqual([b.id])
  })

  it('formatDigifiVerifyCarefullyWarning returns null when count is zero', () => {
    expect(formatDigifiVerifyCarefullyWarning(0)).toBeNull()
    expect(formatDigifiVerifyCarefullyWarning(3)).toContain('3 cells')
  })

  it('countDigifiVerifyCarefullyCells counts flagged cells on page', () => {
    const col = createBuilderColumn({ fieldKey: 'departure', order: 0 })
    const row: BuilderRow = {
      cells: { [col.id]: 'KORD' },
      digifiCellMeta: { [col.id]: baseMeta('departure', { verifyCarefully: true }) },
    }
    expect(countDigifiVerifyCarefullyCells([row], [col.id])).toBe(1)
  })
})
