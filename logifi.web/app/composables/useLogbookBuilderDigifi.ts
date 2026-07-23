import { ref, computed, inject } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { useDigifiCredits } from '~/composables/useDigifiCredits'
import { saveDraftNow } from '~/composables/useLogbookBuilderDraft'
import type {
  DigifiScanChunkMeta,
  DigifiPageSide,
  DigifiScanMeta,
  DigifiScanResponse,
  DigifiTemplateColumn,
} from '~/utils/digifiTypes'
import {
  analyzeDigifiScanRows,
  formatDigifiScanWarning,
} from '~/utils/digifiScanDiagnostics'
import {
  computeRemarksColumnCrop,
  computeRowBandRect,
  pageColumnsIncludeRemarks,
  type RemarksCropContext,
} from '~/utils/digifiRowBandGeometry'

/** Match server Gemini prep (digifiImagePrep) to avoid uploading oversized photos. */
const MAX_EDGE_PX = 1536
const JPEG_QUALITY = 0.92
const MAX_PRIMARY_IMAGE_BYTES = 7_500_000
const ROW_BAND_SIZE = 5
const ROW_BAND_OVERLAP = 1
/** Exclude bottom strip from row-band math (totals/carry-forward — not in rowCount). */
const ROW_BAND_FOOTER_LINES_EXCLUDED = 1
const PAGE_HORIZONTAL_MARGIN_RATIO = 0.03
const PAGE_VERTICAL_MARGIN_RATIO = 0.06

interface PreparedChunkImage {
  partName: string
  rowStart: number
  rowEnd: number
  file: File
}

interface PreparedScanAssets {
  imageFile: File
  previewBlob: Blob
  mimeType: string
  chunkMeta: DigifiScanChunkMeta[]
  chunkFiles: PreparedChunkImage[]
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))),
      mimeType,
      quality
    )
  })
}

function buildChunkRanges(rowCount: number): Array<{ rowStart: number; rowEnd: number }> {
  if (rowCount <= 0) return []
  const ranges: Array<{ rowStart: number; rowEnd: number }> = []
  const step = Math.max(1, ROW_BAND_SIZE - ROW_BAND_OVERLAP)
  for (let rowStart = 0; rowStart < rowCount; rowStart += step) {
    const rowEnd = Math.min(rowCount - 1, rowStart + ROW_BAND_SIZE - 1)
    if (!ranges.some((range) => range.rowStart === rowStart && range.rowEnd === rowEnd)) {
      ranges.push({ rowStart, rowEnd })
    }
    if (rowEnd === rowCount - 1) break
  }
  return ranges
}

async function prepareScanAssets(
  file: File,
  rowCount: number,
  remarksContext: RemarksCropContext
): Promise<PreparedScanAssets> {
  const preferredMimeType =
    file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg'
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.')
  }

  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  const maxEdge = Math.max(width, height)
  const scale = maxEdge > MAX_EDGE_PX ? MAX_EDGE_PX / maxEdge : 1
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image')
  ctx.drawImage(bitmap, 0, 0, w, h)

  let overviewMimeType = preferredMimeType
  let previewBlob =
    file.size <= MAX_PRIMARY_IMAGE_BYTES &&
    preferredMimeType === file.type &&
    maxEdge <= MAX_EDGE_PX
      ? file
      : await canvasToBlob(canvas, preferredMimeType, JPEG_QUALITY)

  if (previewBlob.size > MAX_PRIMARY_IMAGE_BYTES) {
    overviewMimeType = 'image/jpeg'
    previewBlob = await canvasToBlob(canvas, overviewMimeType, 0.88)
  }

  const imageExt = overviewMimeType === 'image/png' ? 'png' : overviewMimeType === 'image/webp' ? 'webp' : 'jpg'
  const imageFile = new File([previewBlob], `scan.${imageExt}`, { type: overviewMimeType })

  const insetX = Math.max(0, Math.round(w * PAGE_HORIZONTAL_MARGIN_RATIO))
  const insetY = Math.max(0, Math.round(h * PAGE_VERTICAL_MARGIN_RATIO))
  const cropX = Math.min(insetX, Math.max(0, w - 1))
  const cropY = Math.min(insetY, Math.max(0, h - 1))
  const cropWidth = Math.max(1, w - cropX * 2)
  const fullUsableHeight = Math.max(1, h - cropY * 2)
  const preliminaryRowHeight = fullUsableHeight / Math.max(1, rowCount)
  const footerReservePx = preliminaryRowHeight * ROW_BAND_FOOTER_LINES_EXCLUDED
  const usableHeight = Math.max(preliminaryRowHeight, fullUsableHeight - footerReservePx)
  const rowHeight = usableHeight / Math.max(1, rowCount)
  const flightAreaBottom = cropY + usableHeight
  const remarksCrop = pageColumnsIncludeRemarks(remarksContext)
    ? computeRemarksColumnCrop(cropX, cropWidth, remarksContext)
    : null

  const chunkMeta: DigifiScanChunkMeta[] = []
  const chunkFiles: PreparedChunkImage[] = []

  for (const range of buildChunkRanges(rowCount)) {
    const bandRect = computeRowBandRect({
      cropX,
      cropY,
      cropWidth,
      rowHeight,
      flightAreaBottom,
      rowStart: range.rowStart,
      rowEnd: range.rowEnd,
      remarksCrop,
    })
    const chunkCanvas = document.createElement('canvas')
    chunkCanvas.width = bandRect.chunkWidth
    chunkCanvas.height = bandRect.chunkHeight
    const chunkCtx = chunkCanvas.getContext('2d')
    if (!chunkCtx) continue
    chunkCtx.drawImage(
      canvas,
      bandRect.sourceX,
      bandRect.startY,
      bandRect.sourceWidth,
      bandRect.chunkHeight,
      0,
      0,
      bandRect.chunkWidth,
      bandRect.chunkHeight
    )
    const chunkBlob = await canvasToBlob(chunkCanvas, 'image/jpeg', 0.9)
    const partName = `chunk-${range.rowStart}-${range.rowEnd}`
    chunkMeta.push({ partName, rowStart: range.rowStart, rowEnd: range.rowEnd })
    chunkFiles.push({
      partName,
      rowStart: range.rowStart,
      rowEnd: range.rowEnd,
      file: new File([chunkBlob], `${partName}.jpg`, { type: 'image/jpeg' }),
    })
  }

  bitmap.close()

  return {
    imageFile,
    previewBlob,
    mimeType: overviewMimeType,
    chunkMeta,
    chunkFiles,
  }
}

export function useLogbookBuilderDigifi() {
  const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
  if (!grid) {
    throw new Error('useLogbookBuilderDigifi must be used inside logbook-builder page')
  }

  const { getAccessToken, isAuthenticated, user } = useAuth()
  const { setCreditsFromScan, fetchBalance } = useDigifiCredits()
  const {
    visibleColumns,
    layout,
    rowCount,
    effectiveSplitIndex,
    defaultYear,
    spreadId,
    applyScanResults,
    recordDigifiScanStatus,
    leftPageScanned,
    resetDigifiPageState,
  } = grid

  const scanning = ref(false)
  const error = ref<string | null>(null)
  const lastThumbnailUrl = ref<string | null>(null)
  const lastFilledCount = ref(0)
  const scanRowWarning = ref<string | null>(null)
  const scanPhase = ref<string | null>(null)
  const scanDetail = ref<string | null>(null)
  const lastScanSummary = ref<{
    pageSide: DigifiPageSide
    expectedRowCount: number
    rowsReturned: number
    strategyUsed: DigifiScanResponse['strategyUsed']
    chunkCount: number
    rescueRecoveredCount: number
  } | null>(null)

  const canScan = computed(() => isAuthenticated.value && visibleColumns.value.length > 0)

  function buildMeta(pageSide: DigifiPageSide, chunkMeta: DigifiScanChunkMeta[], templateName?: string): DigifiScanMeta {
    const columns: DigifiTemplateColumn[] = visibleColumns.value.map((c) => ({
      id: c.id,
      label: c.label,
      fieldKey: c.fieldKey,
      order: c.order,
      categoryClassValue: c.categoryClassValue,
    }))
    return {
      spreadId: spreadId.value,
      pageSide,
      layout: layout.value,
      rowCount: rowCount.value,
      twoPageSplitIndex: effectiveSplitIndex.value,
      defaultYear: defaultYear.value,
      templateName,
      columns,
      chunkedScan: chunkMeta.length > 0
        ? {
            strategy: 'page-overview+row-bands',
            chunkSize: ROW_BAND_SIZE,
            overlapRows: ROW_BAND_OVERLAP,
            chunks: chunkMeta,
          }
        : undefined,
    }
  }

  function authHeaders(): Record<string, string> {
    const token = getAccessToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }

  async function scanPage(file: File, pageSide: DigifiPageSide, templateName?: string) {
    if (scanning.value) {
      console.warn('[digifi] scan already in progress — ignoring duplicate request')
      return
    }

    if (!isAuthenticated.value) {
      error.value = 'Sign in to use Digifi scanning.'
      return
    }

    if (layout.value === 'two-page' && pageSide === 'right' && !leftPageScanned.value) {
      error.value = 'Scan the left page first when using two-page layout.'
      return
    }

    scanning.value = true
    scanPhase.value = 'Uploading image'
    scanDetail.value = null
    error.value = null
    scanRowWarning.value = null
    lastFilledCount.value = 0
    lastScanSummary.value = null

    try {
      const prepared = await prepareScanAssets(file, rowCount.value, {
        pageSide,
        layout: layout.value,
        twoPageSplitIndex: effectiveSplitIndex.value,
        columns: visibleColumns.value.map((c) => ({
          id: c.id,
          label: c.label,
          fieldKey: c.fieldKey,
          order: c.order,
          categoryClassValue: c.categoryClassValue,
        })),
      })
      scanPhase.value = 'Reading page'

      const form = new FormData()
      form.append('image', prepared.imageFile)
      for (const chunk of prepared.chunkFiles) {
        form.append(chunk.partName, chunk.file)
      }
      form.append('meta', JSON.stringify(buildMeta(pageSide, prepared.chunkMeta, templateName)))

      const result = await $fetch<DigifiScanResponse>('/api/digifi/scan', {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      })
      scanPhase.value = 'Filling rows'

      setCreditsFromScan(result.credits)

      const applied = applyScanResults(pageSide, result.rows)
      lastFilledCount.value = applied.filled
      saveDraftNow(grid, user.value?.id)

      const diagnostics =
        result.missingRowIndices != null
          ? {
              rowsReturned: result.rowsReturned ?? analyzeDigifiScanRows(result.rows, rowCount.value).rowsReturned,
              distinctRowIndices: [...new Set(result.rows.map((r) => r.rowIndex))].sort((a, b) => a - b),
              missingRowIndices: result.missingRowIndices,
              duplicateRowIndices: result.duplicateRowIndices ?? [],
              emptyRowIndices: result.emptyRowIndices ?? [],
              hasGaps: result.hasGaps ?? false,
            }
          : analyzeDigifiScanRows(result.rows, rowCount.value)
      const rowWarning = formatDigifiScanWarning(diagnostics, rowCount.value)
      const reviewWarning =
        (result.reviewMessages?.length ?? 0) > 0
          ? `${result.reviewRequiredCount ?? result.reviewMessages?.length ?? 0} identification/airport value(s) need review.`
          : null
      const fallbackWarning =
        result.fallbackUsed && (result.modelsAttempted?.length ?? 0) > 1
          ? `Used fallback model path (${result.modelsAttempted?.join(' -> ')}).`
          : null
      scanRowWarning.value = [rowWarning, reviewWarning, fallbackWarning].filter(Boolean).join(' ')
      recordDigifiScanStatus({
        pageSide,
        expectedRowCount: rowCount.value,
        baseRow: applied.baseRow,
        allowedColumnIds: applied.allowedColumnIds,
        rowsReturned: diagnostics.rowsReturned,
        distinctRowIndices: diagnostics.distinctRowIndices,
        missingRowIndices: diagnostics.missingRowIndices,
        duplicateRowIndices: diagnostics.duplicateRowIndices,
        emptyRowIndices: diagnostics.emptyRowIndices,
        hasGaps: diagnostics.hasGaps,
        strategyUsed: result.strategyUsed,
        chunkCount: result.chunkCount,
        rescueAttempted: result.rescueAttempted,
        rescueRecoveredCount: result.rescueRecoveredCount,
      })
      lastScanSummary.value = {
        pageSide,
        expectedRowCount: rowCount.value,
        rowsReturned: diagnostics.rowsReturned,
        strategyUsed: result.strategyUsed,
        chunkCount: result.chunkCount,
        rescueRecoveredCount: result.rescueRecoveredCount,
      }

      if (lastThumbnailUrl.value) {
        URL.revokeObjectURL(lastThumbnailUrl.value)
      }
      lastThumbnailUrl.value = URL.createObjectURL(prepared.previewBlob)
      scanPhase.value = 'Applying results'
      const creditNote =
        result.creditCharged === false
          ? 'No additional credit used for this scan.'
          : null
      scanDetail.value = [
        result.scanTimings != null
          ? `Scan completed in ${Math.round(result.scanTimings.totalRequestMs)}ms (AI ${Math.round(result.scanTimings.geminiMs)}ms).`
          : null,
        result.apiCallCount != null
          ? `AI API calls for this page: ${result.apiCallCount}.`
          : result.geminiApiCallCount != null
            ? `AI API calls for this page: ${result.geminiApiCallCount}.`
            : null,
        creditNote,
      ]
        .filter(Boolean)
        .join(' ')
    } catch (e: unknown) {
      let msg = 'Scan failed. Try again with a clearer photo.'
      if (e && typeof e === 'object') {
        const err = e as {
          statusCode?: number
          data?: { statusMessage?: string; message?: string }
          statusMessage?: string
          message?: string
        }
        if (err.statusCode === 402) {
          msg =
            err.data?.statusMessage ??
            'Insufficient credits. Add pages from your dashboard.'
          void fetchBalance()
        } else {
          msg =
            err.data?.statusMessage ??
            err.data?.message ??
            err.statusMessage ??
            err.message ??
            msg
        }
      }
      error.value = msg
    } finally {
      scanning.value = false
      scanPhase.value = null
    }
  }

  return {
    scanning,
    error,
    lastThumbnailUrl,
    lastFilledCount,
    lastScanSummary,
    scanRowWarning,
    scanPhase,
    scanDetail,
    canScan,
    scanPage,
    resetDigifiPageState,
    leftPageScanned,
    layout,
  }
}
