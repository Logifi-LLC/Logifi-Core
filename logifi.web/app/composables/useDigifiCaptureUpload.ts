import { onUnmounted, ref, type Ref } from 'vue'
import type { DigifiPageSide } from '~/utils/digifiTypes'
import { apiFetch } from '~/utils/apiFetch'

interface SessionStatusResponse {
  ok: true
  sessionId: string
  isActive: boolean
  expiresAt: string
}

export function useDigifiCaptureUpload(token: Ref<string>) {
  const checking = ref(false)
  const sessionActive = ref(false)
  const sessionError = ref<string | null>(null)
  const uploadingSide = ref<DigifiPageSide | null>(null)
  const uploadMessage = ref<string | null>(null)
  const lastPreviewBySide = ref<Partial<Record<DigifiPageSide, string>>>({})

  async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))),
        mimeType,
        quality
      )
    })
  }

  async function optimizePhoto(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file)
    const maxWidth = 1600
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not optimize photo')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await canvasToBlob(canvas, mimeType, 0.78)
    const ext = mimeType === 'image/png' ? 'png' : 'jpg'
    return new File([blob], `capture.${ext}`, { type: mimeType })
  }

  async function validateToken() {
    if (!token.value) {
      checking.value = false
      sessionActive.value = false
      sessionError.value = 'Missing capture token.'
      return
    }
    checking.value = true
    sessionError.value = null
    try {
      const response = await apiFetch<SessionStatusResponse>(`/api/digifi/capture/session/${token.value}`)
      sessionActive.value = response.isActive
      if (!response.isActive) {
        sessionError.value = 'This capture session is closed or expired.'
      }
    } catch (error: unknown) {
      sessionActive.value = false
      sessionError.value =
        (error as { data?: { statusMessage?: string } })?.data?.statusMessage ??
        'Could not validate capture session.'
    } finally {
      checking.value = false
    }
  }

  async function uploadWithRetry(file: File, pageSide: DigifiPageSide): Promise<void> {
    const attempts = [0, 600, 1400]
    let lastError: unknown = null
    for (const delay of attempts) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
      try {
        const form = new FormData()
        form.append('token', token.value)
        form.append('pageSide', pageSide)
        form.append('image', file)
        await apiFetch('/api/digifi/capture/upload', {
          method: 'POST',
          body: form,
        })
        return
      } catch (error) {
        lastError = error
      }
    }
    throw lastError ?? new Error('Upload failed')
  }

  async function onCaptureFile(pageSide: DigifiPageSide, file: File) {
    if (!file || !sessionActive.value) return

    uploadingSide.value = pageSide
    uploadMessage.value = null
    const sideLabel = pageSide === 'left' ? 'Left page' : 'Right page'

    try {
      const optimized = await optimizePhoto(file)
      const previous = lastPreviewBySide.value[pageSide]
      if (previous) URL.revokeObjectURL(previous)
      lastPreviewBySide.value = {
        ...lastPreviewBySide.value,
        [pageSide]: URL.createObjectURL(optimized),
      }
      await uploadWithRetry(optimized, pageSide)
      uploadMessage.value = `${sideLabel} uploaded. Your laptop should update shortly.`
    } catch (error: unknown) {
      uploadMessage.value =
        (error as { data?: { statusMessage?: string } })?.data?.statusMessage ??
        `${sideLabel} upload failed. Please try again.`
    } finally {
      uploadingSide.value = null
    }
  }

  function resetUploadMessage() {
    uploadMessage.value = null
  }

  function setSessionToken(nextToken: string) {
    if (token.value === nextToken) return
    token.value = nextToken
    sessionError.value = null
    sessionActive.value = false
    resetUploadMessage()
  }

  onUnmounted(() => {
    for (const previewUrl of Object.values(lastPreviewBySide.value)) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  })

  return {
    checking,
    sessionActive,
    sessionError,
    uploadingSide,
    uploadMessage,
    lastPreviewBySide,
    validateToken,
    onCaptureFile,
    resetUploadMessage,
    setSessionToken,
  }
}
