import { ref, computed, inject } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import type {
  DigifiPageSide,
  DigifiScanMeta,
  DigifiScanResponse,
  DigifiTemplateColumn,
} from '~/utils/digifiTypes'
import {
  analyzeDigifiScanRows,
  formatDigifiScanWarning,
} from '~/utils/digifiScanDiagnostics'

const MAX_EDGE_PX = 2000
const JPEG_QUALITY = 0.85

async function resizeImageFile(file: File): Promise<{ blob: Blob; mimeType: string }> {
  const mimeType =
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
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not compress image'))),
      mimeType,
      JPEG_QUALITY
    )
  })

  return { blob, mimeType }
}

export function useLogbookBuilderDigifi() {
  const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
  if (!grid) {
    throw new Error('useLogbookBuilderDigifi must be used inside logbook-builder page')
  }

  const { getAccessToken, isAuthenticated } = useAuth()
  const {
    visibleColumns,
    layout,
    rowCount,
    effectiveSplitIndex,
    defaultYear,
    applyScanResults,
    leftPageScanned,
    resetDigifiPageState,
  } = grid

  const scanning = ref(false)
  const error = ref<string | null>(null)
  const lastThumbnailUrl = ref<string | null>(null)
  const lastFilledCount = ref(0)
  const scanRowWarning = ref<string | null>(null)
  const useProModel = ref(false)

  const canScan = computed(() => isAuthenticated.value && visibleColumns.value.length > 0)

  function buildMeta(pageSide: DigifiPageSide, templateName?: string): DigifiScanMeta {
    const columns: DigifiTemplateColumn[] = visibleColumns.value.map((c) => ({
      id: c.id,
      label: c.label,
      fieldKey: c.fieldKey,
      order: c.order,
      categoryClassValue: c.categoryClassValue,
    }))
    return {
      pageSide,
      layout: layout.value,
      rowCount: rowCount.value,
      twoPageSplitIndex: effectiveSplitIndex.value,
      defaultYear: defaultYear.value,
      templateName,
      columns,
      useProModel: useProModel.value,
    }
  }

  function authHeaders(): Record<string, string> {
    const token = getAccessToken()
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }

  async function scanPage(file: File, pageSide: DigifiPageSide, templateName?: string) {
    if (!isAuthenticated.value) {
      error.value = 'Sign in to use Digifi scanning.'
      return
    }

    if (layout.value === 'two-page' && pageSide === 'right' && !leftPageScanned.value) {
      error.value = 'Scan the left page first when using two-page layout.'
      return
    }

    scanning.value = true
    error.value = null
    scanRowWarning.value = null
    lastFilledCount.value = 0

    try {
      const { blob, mimeType } = await resizeImageFile(file)
      const ext =
        mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
      const imageFile = new File([blob], `scan.${ext}`, { type: mimeType })

      const form = new FormData()
      form.append('image', imageFile)
      form.append('meta', JSON.stringify(buildMeta(pageSide, templateName)))

      const result = await $fetch<DigifiScanResponse>('/api/digifi/scan', {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      })

      const filled = applyScanResults(pageSide, result.rows)
      lastFilledCount.value = filled

      const diagnostics =
        result.missingRowIndices != null
          ? {
              rowsReturned: result.rowsReturned ?? analyzeDigifiScanRows(result.rows, rowCount.value).rowsReturned,
              distinctRowIndices: [...new Set(result.rows.map((r) => r.rowIndex))].sort((a, b) => a - b),
              missingRowIndices: result.missingRowIndices,
              hasGaps: result.hasGaps ?? false,
            }
          : analyzeDigifiScanRows(result.rows, rowCount.value)
      scanRowWarning.value = formatDigifiScanWarning(diagnostics, rowCount.value)

      if (lastThumbnailUrl.value) {
        URL.revokeObjectURL(lastThumbnailUrl.value)
      }
      lastThumbnailUrl.value = URL.createObjectURL(blob)
    } catch (e: unknown) {
      let msg = 'Scan failed. Try again with a clearer photo.'
      if (e && typeof e === 'object') {
        const err = e as {
          data?: { statusMessage?: string; message?: string }
          statusMessage?: string
          message?: string
        }
        msg =
          err.data?.statusMessage ??
          err.data?.message ??
          err.statusMessage ??
          err.message ??
          msg
      }
      error.value = msg
    } finally {
      scanning.value = false
    }
  }

  return {
    scanning,
    error,
    lastThumbnailUrl,
    lastFilledCount,
    scanRowWarning,
    useProModel,
    canScan,
    scanPage,
    resetDigifiPageState,
    leftPageScanned,
    layout,
  }
}
