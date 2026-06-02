<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useLogbookBuilderDigifi } from '~/composables/useLogbookBuilderDigifi'
import { useDigifiCompanionCapture } from '~/composables/useDigifiCompanionCapture'
import { useDigifiCredits } from '~/composables/useDigifiCredits'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'
import type { DigifiCapturePhoto, DigifiPageSide } from '~/utils/digifiTypes'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ScanQueueItem {
  photoId: string
  pageSide: DigifiPageSide
  createdAt: string
}

const {
  scanning,
  error,
  lastFilledCount,
  lastScanSummary,
  scanRowWarning,
  scanPhase,
  scanDetail,
  useProModel,
  canScan,
  scanPage,
  leftPageScanned,
  layout,
} = useLogbookBuilderDigifi()

const { isAuthenticated } = useAuth()
const { fetchBalance } = useDigifiCredits()
const { theme } = useTheme()
const showAddCreditsModal = ref(false)

const leftInputRef = ref<HTMLInputElement | null>(null)
const rightInputRef = ref<HTMLInputElement | null>(null)
const successMessage = ref<string | null>(null)
const companionMessage = ref<string | null>(null)
const dragOverSide = ref<DigifiPageSide | null>(null)
const scanningSide = ref<DigifiPageSide | null>(null)
const applyingCapturedPhoto = ref(false)
const queueStatus = ref<string | null>(null)

const zonePreviewUrl = ref<Record<DigifiPageSide, string | null>>({ left: null, right: null })
const zonePreviewObjectUrls = ref<Record<DigifiPageSide, string | null>>({ left: null, right: null })

const knownPhotoIds = ref(new Set<string>())
const processedPhotoIds = ref(new Set<string>())
const scanQueue = ref<ScanQueueItem[]>([])
const drainingQueue = ref(false)

const {
  creatingSession,
  sessionError,
  qrDataUrl,
  mobileUrl,
  photos,
  selectedPhotoId,
  selectedPhoto,
  loadingPhotos,
  isSessionActive,
  createSession,
  loadPhotos,
  refreshSessionStatus,
  getPhotoFile,
  getSelectedPhotoFile,
} = useDigifiCompanionCapture()

const companionCaptureOrigin = computed(() => {
  if (!mobileUrl.value) return null
  try {
    return new URL(mobileUrl.value).origin
  } catch {
    return null
  }
})

const isDark = computed(() => theme.value === 'dark')

const unlabeledPhotos = computed(() => photos.value.filter((photo) => !photo.pageSide))

const canScanRight = computed(() => {
  if (!canScan.value || scanning.value) return false
  if (layout.value === 'two-page') return leftPageScanned.value
  return true
})

function isAcceptedImage(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/')
}

function inputRefFor(pageSide: DigifiPageSide) {
  return pageSide === 'left' ? leftInputRef : rightInputRef
}

function canUseDropZone(pageSide: DigifiPageSide): boolean {
  if (!canScan.value || scanning.value) return false
  if (pageSide === 'right') return canScanRight.value
  return true
}

function setZonePreview(pageSide: DigifiPageSide, url: string | null, isObjectUrl = false) {
  const oldObjectUrl = zonePreviewObjectUrls.value[pageSide]
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl)
  }
  zonePreviewUrl.value = {
    ...zonePreviewUrl.value,
    [pageSide]: url,
  }
  zonePreviewObjectUrls.value = {
    ...zonePreviewObjectUrls.value,
    [pageSide]: isObjectUrl ? url : null,
  }
}

function updateQueueStatus() {
  if (scanning.value && scanningSide.value) {
    queueStatus.value = `Scanning ${scanningSide.value} page…`
    return
  }

  const hasQueuedRight = scanQueue.value.some((item) => item.pageSide === 'right')
  const hasQueuedLeft = scanQueue.value.some((item) => item.pageSide === 'left')
  const rightBlocked =
    layout.value === 'two-page' && !leftPageScanned.value && hasQueuedRight && !hasQueuedLeft

  if (rightBlocked) {
    queueStatus.value = 'Queued right page — waiting for left to finish'
    return
  }

  if (scanQueue.value.length > 0) {
    queueStatus.value = 'Preparing next scan…'
    return
  }

  queueStatus.value = null
}

function enqueuePhoto(photo: DigifiCapturePhoto) {
  if (!photo.pageSide) return
  scanQueue.value = scanQueue.value.filter((item) => item.pageSide !== photo.pageSide)
  if (!processedPhotoIds.value.has(photo.id)) {
    scanQueue.value.push({
      photoId: photo.id,
      pageSide: photo.pageSide,
      createdAt: photo.createdAt,
    })
  }
}

function pickNextScanJob(): ScanQueueItem | null {
  const pending = [...scanQueue.value].sort((a, b) => {
    if (a.pageSide !== b.pageSide) return a.pageSide === 'left' ? -1 : 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  for (const item of pending) {
    if (item.pageSide === 'right' && layout.value === 'two-page' && !leftPageScanned.value) {
      continue
    }
    return item
  }
  return null
}

function handleNewPhotos(newPhotos: DigifiCapturePhoto[]) {
  for (const photo of newPhotos) {
    if (knownPhotoIds.value.has(photo.id)) continue
    knownPhotoIds.value.add(photo.id)

    if (!photo.pageSide) {
      companionMessage.value =
        'A photo arrived without a page label. Use the options below to assign it, or recapture on your phone.'
      continue
    }

    if (photo.signedUrl) {
      setZonePreview(photo.pageSide, photo.signedUrl, false)
    }
    enqueuePhoto(photo)
  }
}

async function drainScanQueue() {
  if (drainingQueue.value || scanning.value || !canScan.value) {
    updateQueueStatus()
    return
  }

  const next = pickNextScanJob()
  if (!next) {
    updateQueueStatus()
    return
  }

  const photo = photos.value.find((item) => item.id === next.photoId)
  if (!photo) {
    scanQueue.value = scanQueue.value.filter((item) => item.photoId !== next.photoId)
    updateQueueStatus()
    return
  }

  drainingQueue.value = true
  scanQueue.value = scanQueue.value.filter((item) => item.photoId !== next.photoId)

  try {
    const file = await getPhotoFile(photo)
    if (file) {
      await processFile(file, next.pageSide, { fromQueue: true })
      processedPhotoIds.value.add(next.photoId)
    }
  } catch (err: unknown) {
    companionMessage.value = (err as Error).message || 'Could not scan captured photo.'
  } finally {
    drainingQueue.value = false
    updateQueueStatus()
    void drainScanQueue()
  }
}

watch(
  photos,
  (currentPhotos) => {
    const newPhotos = currentPhotos.filter((photo) => !knownPhotoIds.value.has(photo.id))
    if (newPhotos.length === 0) return
    handleNewPhotos(newPhotos)
    void drainScanQueue()
  },
  { deep: true }
)

watch(scanning, (isScanning, wasScanning) => {
  if (wasScanning && !isScanning) {
    updateQueueStatus()
    void drainScanQueue()
  }
})

async function processFile(
  file: File | undefined,
  pageSide: DigifiPageSide,
  options?: { fromQueue?: boolean }
) {
  if (!file) return
  if (!isAcceptedImage(file)) {
    error.value = 'Please use a JPEG, PNG, or WebP image.'
    return
  }
  if (!canScan.value) return
  if (!options?.fromQueue && !canUseDropZone(pageSide)) return

  setZonePreview(pageSide, URL.createObjectURL(file), true)
  successMessage.value = null
  scanningSide.value = pageSide
  updateQueueStatus()
  try {
    await scanPage(file, pageSide)
  } finally {
    scanningSide.value = null
    updateQueueStatus()
  }

  if (!error.value && lastFilledCount.value > 0) {
    const rowsMatched = lastScanSummary.value?.rowsReturned ?? 0
    const expectedRows = lastScanSummary.value?.expectedRowCount ?? 0
    const rescueNote =
      (lastScanSummary.value?.rescueRecoveredCount ?? 0) > 0
        ? ` Rescue recovered ${lastScanSummary.value?.rescueRecoveredCount} row(s).`
        : ''
    successMessage.value = `Captured ${rowsMatched}/${expectedRows} row(s) and filled ${lastFilledCount.value} cells.${rescueNote} Please review before importing.`
  } else if (!error.value) {
    successMessage.value = 'Scan complete. Review the grid and edit any misread cells.'
  }
  void fetchBalance()
}

async function onFileSelected(pageSide: DigifiPageSide, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  await processFile(file, pageSide)
}

function openFilePicker(pageSide: DigifiPageSide) {
  if (!canUseDropZone(pageSide)) return
  inputRefFor(pageSide).value?.click()
}

function onDragEnter(pageSide: DigifiPageSide, e: DragEvent) {
  e.preventDefault()
  if (!canUseDropZone(pageSide)) return
  dragOverSide.value = pageSide
}

function onDragOver(pageSide: DigifiPageSide, e: DragEvent) {
  e.preventDefault()
  if (!canUseDropZone(pageSide)) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  dragOverSide.value = pageSide
}

function onDragLeave(pageSide: DigifiPageSide, e: DragEvent) {
  e.preventDefault()
  const related = e.relatedTarget as Node | null
  const current = e.currentTarget as HTMLElement
  if (related && current.contains(related)) return
  if (dragOverSide.value === pageSide) dragOverSide.value = null
}

async function onDrop(pageSide: DigifiPageSide, e: DragEvent) {
  e.preventDefault()
  dragOverSide.value = null
  const file = e.dataTransfer?.files?.[0]
  await processFile(file, pageSide)
}

async function createPhoneSession() {
  companionMessage.value = null
  knownPhotoIds.value = new Set()
  processedPhotoIds.value = new Set()
  scanQueue.value = []
  await createSession()
}

async function refreshPhotosFromServer() {
  await loadPhotos()
  for (const photo of photos.value) {
    if (photo.pageSide && photo.signedUrl) {
      setZonePreview(photo.pageSide, photo.signedUrl, false)
    }
  }
}

async function copyMobileLink() {
  if (!mobileUrl.value || !import.meta.client) return
  await navigator.clipboard.writeText(mobileUrl.value)
  companionMessage.value = 'Mobile link copied.'
}

function capturePhotoLabel(photo: DigifiCapturePhoto): string {
  const time = new Date(photo.createdAt).toLocaleTimeString()
  const sizeKb = Math.round(photo.byteSize / 1024)
  return `${time} · ${sizeKb} KB`
}

async function useSelectedCapture(pageSide: DigifiPageSide) {
  if (!selectedPhoto.value) return
  if (selectedPhoto.value.pageSide && selectedPhoto.value.pageSide !== pageSide) {
    companionMessage.value = `This photo was captured as ${selectedPhoto.value.pageSide} page on your phone.`
    return
  }
  applyingCapturedPhoto.value = true
  companionMessage.value = null
  try {
    const file = await getSelectedPhotoFile()
    if (!file) {
      companionMessage.value = 'Select a captured photo first.'
      return
    }
    setZonePreview(pageSide, selectedPhoto.value.signedUrl, false)
    await processFile(file, pageSide)
    if (!error.value) companionMessage.value = `Applied captured photo to ${pageSide} page.`
  } catch (err: unknown) {
    companionMessage.value = (err as Error).message || 'Could not use selected capture photo.'
  } finally {
    applyingCapturedPhoto.value = false
  }
}

function dropZoneClasses(pageSide: DigifiPageSide): string[] {
  const enabled = canUseDropZone(pageSide)
  const active = dragOverSide.value === pageSide
  const done = pageSide === 'left' && leftPageScanned.value
  const hasPreview = Boolean(zonePreviewUrl.value[pageSide])

  const base = [
    'relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all min-h-[180px] overflow-hidden',
    enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
  ]

  if (active && enabled) {
    base.push(
      isDark.value
        ? 'border-blue-400 bg-blue-500/15 scale-[1.01]'
        : 'border-blue-500 bg-blue-50 scale-[1.01]'
    )
  } else if (done && pageSide === 'left' && !hasPreview) {
    base.push(
      isDark.value
        ? 'border-green-500/50 bg-green-500/10'
        : 'border-green-400 bg-green-50'
    )
  } else if (hasPreview) {
    base.push(isDark.value ? 'border-white/20 bg-black/20' : 'border-gray-300 bg-gray-100')
  } else {
    base.push(
      isDark.value
        ? 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]'
        : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
    )
  }

  return base
}

function dropZoneHelperText(pageSide: DigifiPageSide): string {
  if (scanningSide.value === pageSide) return 'Scanning…'
  if (zonePreviewUrl.value[pageSide] && pageSide === 'left' && leftPageScanned.value) return 'Done — review the grid'
  if (zonePreviewUrl.value[pageSide]) return 'Photo received'
  if (!isAuthenticated.value) return 'Sign in to upload'
  if (!canScan.value) return 'Configure columns first'
  if (pageSide === 'right' && layout.value === 'two-page' && !leftPageScanned.value) {
    return 'Scan the left page first'
  }
  return 'Drag & drop a photo here, or click to browse'
}

onUnmounted(() => {
  for (const side of ['left', 'right'] as DigifiPageSide[]) {
    const objectUrl = zonePreviewObjectUrls.value[side]
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
})
</script>

<template>
  <section
    class="rounded-3xl p-4 sm:p-6 font-quicksand border shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
    :class="isDark ? 'border-white/10 bg-gray-900' : 'border-gray-200 bg-white'"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
      <p class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
        Upload page photos to pre-fill the grid.
      </p>
      <DigifiCreditsIndicator compact @open-checkout="showAddCreditsModal = true" />
    </div>

    <p
      class="text-xs mb-4 rounded-lg px-3 py-2 border inline-block"
      :class="isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'"
    >
      AI may misread handwriting. You are responsible for verifying all entries before importing.
    </p>

    <p
      v-if="scanRowWarning"
      class="text-sm mb-4 rounded-lg px-3 py-2 border"
      :class="isDark ? 'border-orange-500/40 bg-orange-500/10 text-orange-200' : 'border-orange-300 bg-orange-50 text-orange-900'"
      role="alert"
    >
      {{ scanRowWarning }}
    </p>

    <input
      ref="leftInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileSelected('left', $event)"
    >
    <input
      ref="rightInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileSelected('right', $event)"
    >

    <p
      v-if="queueStatus"
      class="text-xs mb-3 rounded-lg px-3 py-2 border"
      :class="isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'"
    >
      {{ queueStatus }}
    </p>
    <p
      v-if="scanning && scanPhase"
      class="text-xs mb-3 rounded-lg px-3 py-2 border"
      :class="isDark ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100' : 'border-indigo-200 bg-indigo-50 text-indigo-800'"
    >
      {{ scanPhase }}…
    </p>

    <div class="grid sm:grid-cols-2 gap-4">
      <!-- Left page drop zone -->
      <div
        role="button"
        tabindex="0"
        :aria-disabled="!canUseDropZone('left')"
        :aria-label="scanningSide === 'left' ? 'Scanning left page' : 'Upload or drop left logbook page photo'"
        :class="dropZoneClasses('left')"
        @click="openFilePicker('left')"
        @keydown.enter.prevent="openFilePicker('left')"
        @keydown.space.prevent="openFilePicker('left')"
        @dragenter="onDragEnter('left', $event)"
        @dragover="onDragOver('left', $event)"
        @dragleave="onDragLeave('left', $event)"
        @drop="onDrop('left', $event)"
      >
        <img
          v-if="zonePreviewUrl.left"
          :src="zonePreviewUrl.left"
          alt="Left page preview"
          class="absolute inset-0 h-full w-full object-cover"
        >
        <div
          v-if="zonePreviewUrl.left"
          class="absolute inset-0"
          :class="isDark ? 'bg-black/40' : 'bg-white/30'"
        />

        <div class="relative z-10 flex flex-col items-center gap-2">
          <Icon
            v-if="scanningSide === 'left'"
            name="ri:loader-4-line"
            size="32"
            class="animate-spin text-blue-400 drop-shadow"
          />
          <Icon
            v-else-if="leftPageScanned && !zonePreviewUrl.left"
            name="ri:check-line"
            size="32"
            class="text-green-500"
          />
          <Icon
            v-else-if="!zonePreviewUrl.left"
            name="ri:image-add-line"
            size="32"
            :class="isDark ? 'text-gray-400' : 'text-gray-500'"
          />
          <p
            class="text-sm font-semibold drop-shadow-sm"
            :class="zonePreviewUrl.left ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white' : 'text-gray-900')"
          >
            {{ scanningSide === 'left' ? 'Scanning…' : '1. Left page' }}
          </p>
          <p
            class="text-xs max-w-[220px] drop-shadow-sm"
            :class="zonePreviewUrl.left ? (isDark ? 'text-gray-200' : 'text-gray-700') : (isDark ? 'text-gray-400' : 'text-gray-600')"
          >
            {{ dropZoneHelperText('left') }}
          </p>
        </div>
      </div>

      <!-- Right page drop zone -->
      <div
        role="button"
        tabindex="0"
        :aria-disabled="!canUseDropZone('right')"
        :aria-label="scanningSide === 'right' ? 'Scanning right page' : 'Upload or drop right logbook page photo'"
        :class="dropZoneClasses('right')"
        @click="openFilePicker('right')"
        @keydown.enter.prevent="openFilePicker('right')"
        @keydown.space.prevent="openFilePicker('right')"
        @dragenter="onDragEnter('right', $event)"
        @dragover="onDragOver('right', $event)"
        @dragleave="onDragLeave('right', $event)"
        @drop="onDrop('right', $event)"
      >
        <img
          v-if="zonePreviewUrl.right"
          :src="zonePreviewUrl.right"
          alt="Right page preview"
          class="absolute inset-0 h-full w-full object-cover"
        >
        <div
          v-if="zonePreviewUrl.right"
          class="absolute inset-0"
          :class="isDark ? 'bg-black/40' : 'bg-white/30'"
        />

        <div class="relative z-10 flex flex-col items-center gap-2">
          <Icon
            v-if="scanningSide === 'right'"
            name="ri:loader-4-line"
            size="32"
            class="animate-spin text-blue-400 drop-shadow"
          />
          <Icon
            v-else-if="!zonePreviewUrl.right"
            name="ri:image-add-line"
            size="32"
            :class="isDark ? 'text-gray-400' : 'text-gray-500'"
          />
          <p
            class="text-sm font-semibold drop-shadow-sm"
            :class="zonePreviewUrl.right ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white' : 'text-gray-900')"
          >
            {{ scanningSide === 'right' ? 'Scanning…' : '2. Right page' }}
          </p>
          <p
            class="text-xs max-w-[220px] drop-shadow-sm"
            :class="zonePreviewUrl.right ? (isDark ? 'text-gray-200' : 'text-gray-700') : (isDark ? 'text-gray-400' : 'text-gray-600')"
          >
            {{ dropZoneHelperText('right') }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <label
        class="inline-flex items-center gap-2 text-sm cursor-pointer"
        :class="isDark ? 'text-gray-300' : 'text-gray-700'"
      >
        <input v-model="useProModel" type="checkbox" class="rounded border-gray-400">
        Higher accuracy (slower)
      </label>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-500 dark:text-red-400">{{ error }}</p>
    <p v-else-if="successMessage" class="mt-3 text-sm text-green-600 dark:text-green-400">{{ successMessage }}</p>
    <p v-if="scanDetail && !error" class="mt-2 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-600'">
      {{ scanDetail }}
    </p>

    <div
      class="mt-6 pt-5 border-t"
      :class="isDark ? 'border-white/10' : 'border-gray-200'"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            Phone companion capture
          </h3>
          <p class="text-xs mt-1" :class="isDark ? 'text-gray-400' : 'text-gray-600'">
            On your phone, pick <strong>Left page</strong> or <strong>Right page</strong> before each photo.
            Photos appear in the zones above and scan automatically.
          </p>
        </div>
        <button
          type="button"
          class="px-3 py-2 text-xs rounded-lg border font-semibold transition-colors"
          :class="isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-900 hover:bg-gray-100'"
          :disabled="creatingSession || !isAuthenticated"
          @click="createPhoneSession"
        >
          {{ creatingSession ? 'Creating…' : 'Connect phone' }}
        </button>
      </div>

      <p v-if="sessionError" class="mt-2 text-xs text-red-500 dark:text-red-400">{{ sessionError }}</p>
      <p v-else-if="companionMessage" class="mt-2 text-xs text-green-600 dark:text-green-400">{{ companionMessage }}</p>

      <div v-if="qrDataUrl" class="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
        <div class="rounded-xl p-2 border inline-flex items-center justify-center" :class="isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'">
          <img :src="qrDataUrl" alt="Phone capture QR code" class="h-[200px] w-[200px] rounded-lg">
        </div>
        <div class="space-y-2">
          <p class="text-xs break-all" :class="isDark ? 'text-gray-400' : 'text-gray-600'">{{ mobileUrl }}</p>
          <p v-if="companionCaptureOrigin" class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-500'">
            QR uses <code class="text-[11px]">{{ companionCaptureOrigin }}</code> (same Wi‑Fi). On your phone, open that
            URL once and accept the dev certificate before scanning. Prefer
            <code class="text-[11px]">{{ companionCaptureOrigin }}/logbook-builder</code> on this laptop instead of
            <code class="text-[11px]">0.0.0.0</code>.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="px-3 py-2 text-xs rounded-lg border font-semibold transition-colors"
              :class="isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-900 hover:bg-gray-100'"
              @click="copyMobileLink"
            >
              Copy link
            </button>
            <button
              type="button"
              class="px-3 py-2 text-xs rounded-lg border font-semibold transition-colors"
              :class="isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-900 hover:bg-gray-100'"
              @click="refreshSessionStatus"
            >
              Refresh status
            </button>
            <button
              type="button"
              class="px-3 py-2 text-xs rounded-lg border font-semibold transition-colors"
              :class="isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-900 hover:bg-gray-100'"
              @click="refreshPhotosFromServer"
            >
              Refresh photos
            </button>
          </div>
          <p class="text-xs" :class="isSessionActive ? 'text-green-500' : 'text-amber-500'">
            {{ isSessionActive ? 'Session active' : 'Session expired or closed' }}
          </p>
        </div>
      </div>

      <details v-if="unlabeledPhotos.length > 0" class="mt-4">
        <summary
          class="text-xs font-semibold cursor-pointer"
          :class="isDark ? 'text-gray-300' : 'text-gray-700'"
        >
          Unlabeled photos ({{ unlabeledPhotos.length }})
        </summary>
        <div class="mt-3 space-y-3">
          <label class="text-xs block" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            Select photo to assign
            <select
              v-model="selectedPhotoId"
              class="mt-1 w-full rounded-lg border px-2 py-2 text-xs"
              :class="isDark ? 'bg-gray-900 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'"
            >
              <option
                v-for="photo in unlabeledPhotos"
                :key="photo.id"
                :value="photo.id"
              >
                {{ capturePhotoLabel(photo) }}
              </option>
            </select>
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="px-3 py-2 text-xs rounded-lg border font-semibold transition-colors"
              :class="isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-900 hover:bg-gray-100'"
              :disabled="applyingCapturedPhoto || scanning || loadingPhotos"
              @click="useSelectedCapture('left')"
            >
              Assign to left
            </button>
            <button
              type="button"
              class="px-3 py-2 text-xs rounded-lg border font-semibold transition-colors"
              :class="isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300 text-gray-900 hover:bg-gray-100'"
              :disabled="applyingCapturedPhoto || scanning || loadingPhotos || !canScanRight"
              @click="useSelectedCapture('right')"
            >
              Assign to right
            </button>
          </div>
        </div>
      </details>
    </div>

    <DigifiAddCreditsModal
      :is-open="showAddCreditsModal"
      @close="showAddCreditsModal = false"
    />
  </section>
</template>
