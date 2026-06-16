import type { DigifiPageSide, DigifiTemplateColumn } from './digifiTypes'
import type { BuilderLayout } from './logbookBuilderTypes'

export const ROW_BAND_TOP_BLEED_RATIO = 0.12
export const ROW_BAND_BOTTOM_BLEED_RATIO = 0.04
export const REMARKS_COLUMN_HORIZONTAL_MARGIN_RATIO = 0.03

export interface RowBandRect {
  startY: number
  endY: number
  sourceX: number
  sourceWidth: number
  chunkWidth: number
  chunkHeight: number
}

export interface RowBandLayoutInput {
  cropX: number
  cropY: number
  cropWidth: number
  rowHeight: number
  flightAreaBottom: number
  rowStart: number
  rowEnd: number
  remarksCrop?: { sourceX: number; sourceWidth: number } | null
}

export interface RemarksCropContext {
  columns: DigifiTemplateColumn[]
  pageSide: DigifiPageSide
  layout: BuilderLayout
  twoPageSplitIndex: number
}

function pageColumns(ctx: RemarksCropContext): DigifiTemplateColumn[] {
  const sorted = [...ctx.columns].sort((a, b) => a.order - b.order)
  if (ctx.layout !== 'two-page') return sorted
  const splitIndex = Math.min(
    Math.max(1, ctx.twoPageSplitIndex),
    Math.max(1, sorted.length - 1)
  )
  if (ctx.pageSide === 'left') return sorted.slice(0, splitIndex)
  return sorted.slice(splitIndex)
}

export function pageColumnsIncludeRemarks(ctx: RemarksCropContext): boolean {
  return pageColumns(ctx).some((column) => column.fieldKey === 'remarks')
}

export function computeRemarksColumnCrop(
  cropX: number,
  cropWidth: number,
  ctx: RemarksCropContext
): { sourceX: number; sourceWidth: number } | null {
  const cols = pageColumns(ctx)
  const remarksIdx = cols.findIndex((column) => column.fieldKey === 'remarks')
  if (remarksIdx < 0 || cols.length === 0) return null

  const colWidth = cropWidth / cols.length
  const marginPx = Math.max(0, Math.round(cropWidth * REMARKS_COLUMN_HORIZONTAL_MARGIN_RATIO))
  const rawX = cropX + Math.floor(remarksIdx * colWidth) - marginPx
  const sourceX = Math.max(cropX, rawX)
  const sourceWidth = Math.max(1, cropX + cropWidth - sourceX)
  return { sourceX, sourceWidth }
}

export function computeRowBandBleedPx(rowHeight: number): {
  topBleedPx: number
  bottomBleedPx: number
} {
  return {
    topBleedPx: Math.max(8, Math.round(rowHeight * ROW_BAND_TOP_BLEED_RATIO)),
    bottomBleedPx: Math.max(4, Math.round(rowHeight * ROW_BAND_BOTTOM_BLEED_RATIO)),
  }
}

export function computeRowBandRect(input: RowBandLayoutInput): RowBandRect {
  const { topBleedPx, bottomBleedPx } = computeRowBandBleedPx(input.rowHeight)
  const startY = Math.max(
    0,
    Math.floor(input.cropY + input.rowStart * input.rowHeight - topBleedPx)
  )
  const endY = Math.min(
    input.flightAreaBottom,
    Math.ceil(input.cropY + (input.rowEnd + 1) * input.rowHeight + bottomBleedPx)
  )
  const chunkHeight = Math.max(1, endY - startY)
  const sourceX = input.remarksCrop?.sourceX ?? input.cropX
  const sourceWidth = input.remarksCrop?.sourceWidth ?? input.cropWidth

  return {
    startY,
    endY,
    sourceX,
    sourceWidth,
    chunkWidth: sourceWidth,
    chunkHeight,
  }
}
