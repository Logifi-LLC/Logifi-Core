import { describe, it, expect } from 'vitest'
import {
  ROW_BAND_BOTTOM_BLEED_RATIO,
  ROW_BAND_TOP_BLEED_RATIO,
  computeRemarksColumnCrop,
  computeRowBandBleedPx,
  computeRowBandRect,
  pageColumnsIncludeRemarks,
} from '../../app/utils/digifiRowBandGeometry'

describe('computeRowBandBleedPx', () => {
  it('uses asymmetric bleed with less padding below than above', () => {
    const rowHeight = 100
    const { topBleedPx, bottomBleedPx } = computeRowBandBleedPx(rowHeight)
    expect(topBleedPx).toBe(Math.max(8, Math.round(rowHeight * ROW_BAND_TOP_BLEED_RATIO)))
    expect(bottomBleedPx).toBe(Math.max(4, Math.round(rowHeight * ROW_BAND_BOTTOM_BLEED_RATIO)))
    expect(bottomBleedPx).toBeLessThan(topBleedPx)
  })
})

describe('computeRowBandRect', () => {
  it('caps endY at flightAreaBottom', () => {
    const rect = computeRowBandRect({
      cropX: 10,
      cropY: 20,
      cropWidth: 500,
      rowHeight: 50,
      flightAreaBottom: 120,
      rowStart: 1,
      rowEnd: 2,
    })
    expect(rect.endY).toBeLessThanOrEqual(120)
    expect(rect.chunkHeight).toBe(rect.endY - rect.startY)
  })

  it('narrows source width when remarks crop is provided', () => {
    const full = computeRowBandRect({
      cropX: 0,
      cropY: 0,
      cropWidth: 1000,
      rowHeight: 40,
      flightAreaBottom: 600,
      rowStart: 0,
      rowEnd: 4,
    })
    const remarks = computeRowBandRect({
      cropX: 0,
      cropY: 0,
      cropWidth: 1000,
      rowHeight: 40,
      flightAreaBottom: 600,
      rowStart: 0,
      rowEnd: 4,
      remarksCrop: { sourceX: 700, sourceWidth: 300 },
    })
    expect(remarks.sourceX).toBe(700)
    expect(remarks.chunkWidth).toBe(300)
    expect(remarks.chunkWidth).toBeLessThan(full.chunkWidth)
  })
})

describe('computeRemarksColumnCrop', () => {
  const columns = [
    { id: 'date', label: 'Date', fieldKey: 'date' as const, order: 0 },
    { id: 'pic', label: 'PIC', fieldKey: 'pic' as const, order: 1 },
    { id: 'remarks', label: 'Remarks', fieldKey: 'remarks' as const, order: 2 },
  ]

  it('returns null when remarks is not on this page', () => {
    expect(
      computeRemarksColumnCrop(0, 900, {
        columns,
        pageSide: 'left',
        layout: 'two-page',
        twoPageSplitIndex: 2,
      })
    ).toBeNull()
  })

  it('crops to remarks column region on right page', () => {
    const crop = computeRemarksColumnCrop(10, 900, {
      columns,
      pageSide: 'right',
      layout: 'two-page',
      twoPageSplitIndex: 1,
    })
    expect(crop).not.toBeNull()
    expect(crop!.sourceX).toBeGreaterThanOrEqual(10)
    expect(crop!.sourceWidth).toBeLessThan(900)
  })

  it('detects remarks on page columns', () => {
    expect(
      pageColumnsIncludeRemarks({
        columns,
        pageSide: 'right',
        layout: 'two-page',
        twoPageSplitIndex: 1,
      })
    ).toBe(true)
    expect(
      pageColumnsIncludeRemarks({
        columns,
        pageSide: 'left',
        layout: 'two-page',
        twoPageSplitIndex: 2,
      })
    ).toBe(false)
  })
})
