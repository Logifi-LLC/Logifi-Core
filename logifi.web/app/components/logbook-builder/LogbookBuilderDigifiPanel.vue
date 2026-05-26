<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLogbookBuilderDigifi } from '~/composables/useLogbookBuilderDigifi'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'
import type { DigifiPageSide } from '~/utils/digifiTypes'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const {
  scanning,
  error,
  lastThumbnailUrl,
  lastFilledCount,
  lastScanSummary,
  scanRowWarning,
  useProModel,
  canScan,
  scanPage,
  leftPageScanned,
  layout,
} = useLogbookBuilderDigifi()

const { isAuthenticated } = useAuth()
const { theme } = useTheme()

const leftInputRef = ref<HTMLInputElement | null>(null)
const rightInputRef = ref<HTMLInputElement | null>(null)
const successMessage = ref<string | null>(null)
const dragOverSide = ref<DigifiPageSide | null>(null)
const scanningSide = ref<DigifiPageSide | null>(null)

const isDark = computed(() => theme.value === 'dark')

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

async function processFile(file: File | undefined, pageSide: DigifiPageSide) {
  if (!file) return
  if (!isAcceptedImage(file)) {
    error.value = 'Please use a JPEG, PNG, or WebP image.'
    return
  }
  if (!canUseDropZone(pageSide)) return

  successMessage.value = null
  scanningSide.value = pageSide
  try {
    await scanPage(file, pageSide)
  } finally {
    scanningSide.value = null
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

function dropZoneClasses(pageSide: DigifiPageSide): string[] {
  const enabled = canUseDropZone(pageSide)
  const active = dragOverSide.value === pageSide
  const done = pageSide === 'left' && leftPageScanned.value

  const base = [
    'relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all min-h-[140px]',
    enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
  ]

  if (active && enabled) {
    base.push(
      isDark.value
        ? 'border-blue-400 bg-blue-500/15 scale-[1.01]'
        : 'border-blue-500 bg-blue-50 scale-[1.01]'
    )
  } else if (done && pageSide === 'left') {
    base.push(
      isDark.value
        ? 'border-green-500/50 bg-green-500/10'
        : 'border-green-400 bg-green-50'
    )
  } else {
    base.push(
      isDark.value
        ? 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]'
        : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
    )
  }

  return base
}
</script>

<template>
  <section
    class="rounded-3xl p-4 sm:p-6 font-quicksand border shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
    :class="isDark ? 'border-white/10 bg-gray-900' : 'border-gray-200 bg-white'"
  >
    <div class="mb-4">
      <h2
        class="text-lg font-semibold flex items-center gap-2"
        :class="isDark ? 'text-white' : 'text-gray-900'"
      >
        <Icon name="ri:scan-line" size="22" class="text-blue-500" />
        Digifi — scan paper logbook
      </h2>
      <p class="text-sm mt-1" :class="isDark ? 'text-gray-400' : 'text-gray-600'">
        Configure your columns (or load a template), set row count, then drag a photo onto each page zone or click to browse.
      </p>
    </div>

    <p
      class="text-xs mb-4 rounded-lg px-3 py-2 border"
      :class="isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'"
    >
      AI may misread handwriting. You are responsible for verifying all entries before importing.
      Photos are sent to Google Gemini and stored temporarily (up to 24 hours). FC View credentials are never sent to AI.
    </p>

    <p
      v-if="scanRowWarning"
      class="text-sm mb-4 rounded-lg px-3 py-2 border"
      :class="isDark ? 'border-orange-500/40 bg-orange-500/10 text-orange-200' : 'border-orange-300 bg-orange-50 text-orange-900'"
      role="alert"
    >
      {{ scanRowWarning }}
    </p>

    <ul
      class="text-sm mb-4 space-y-1 list-disc list-inside"
      :class="isDark ? 'text-gray-400' : 'text-gray-600'"
    >
      <li v-if="!isAuthenticated">Sign in to use Digifi.</li>
      <li v-else-if="!canScan">Add at least one column before scanning.</li>
      <template v-else>
        <li>Set `Rows` to the number of physical paper lines you expect to scan on this page.</li>
        <li v-if="layout === 'two-page'">
        Two-page layout: left photo fills left columns; right photo fills right columns (same rows).
        </li>
        <li v-else>Single layout: left page fills from the top; right page continues on the next rows.</li>
      </template>
    </ul>

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

    <div class="grid sm:grid-cols-2 gap-4">
      <!-- Left page drop zone -->
      <div
        role="button"
        tabindex="0"
        :aria-disabled="!canUseDropZone('left')"
        :aria-label="scanning ? 'Scanning left page' : 'Upload or drop left logbook page photo'"
        :class="dropZoneClasses('left')"
        @click="openFilePicker('left')"
        @keydown.enter.prevent="openFilePicker('left')"
        @keydown.space.prevent="openFilePicker('left')"
        @dragenter="onDragEnter('left', $event)"
        @dragover="onDragOver('left', $event)"
        @dragleave="onDragLeave('left', $event)"
        @drop="onDrop('left', $event)"
      >
        <Icon
          v-if="scanningSide === 'left'"
          name="ri:loader-4-line"
          size="32"
          class="animate-spin text-blue-500"
        />
        <Icon
          v-else-if="leftPageScanned"
          name="ri:check-line"
          size="32"
          class="text-green-500"
        />
        <Icon
          v-else
          name="ri:image-add-line"
          size="32"
          :class="isDark ? 'text-gray-400' : 'text-gray-500'"
        />
        <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ scanningSide === 'left' ? 'Scanning…' : '1. Left page' }}
        </p>
        <p class="text-xs max-w-[220px]" :class="isDark ? 'text-gray-400' : 'text-gray-600'">
          <template v-if="!isAuthenticated">Sign in to upload</template>
          <template v-else-if="!canScan">Configure columns first</template>
          <template v-else>
            Drag &amp; drop a photo here, or click to browse
          </template>
        </p>
      </div>

      <!-- Right page drop zone -->
      <div
        role="button"
        tabindex="0"
        :aria-disabled="!canUseDropZone('right')"
        :aria-label="scanning ? 'Scanning right page' : 'Upload or drop right logbook page photo'"
        :class="dropZoneClasses('right')"
        @click="openFilePicker('right')"
        @keydown.enter.prevent="openFilePicker('right')"
        @keydown.space.prevent="openFilePicker('right')"
        @dragenter="onDragEnter('right', $event)"
        @dragover="onDragOver('right', $event)"
        @dragleave="onDragLeave('right', $event)"
        @drop="onDrop('right', $event)"
      >
        <Icon
          v-if="scanningSide === 'right'"
          name="ri:loader-4-line"
          size="32"
          class="animate-spin text-blue-500"
        />
        <Icon
          v-else
          name="ri:image-add-line"
          size="32"
          :class="isDark ? 'text-gray-400' : 'text-gray-500'"
        />
        <p class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          2. Right page
        </p>
        <p class="text-xs max-w-[220px]" :class="isDark ? 'text-gray-400' : 'text-gray-600'">
          <template v-if="layout === 'two-page' && !leftPageScanned">
            Scan the left page first
          </template>
          <template v-else-if="!isAuthenticated">Sign in to upload</template>
          <template v-else-if="!canScan">Configure columns first</template>
          <template v-else>
            Drag &amp; drop a photo here, or click to browse
          </template>
        </p>
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

    <div v-if="lastThumbnailUrl" class="mt-4 flex items-center gap-3">
      <img
        :src="lastThumbnailUrl"
        alt="Last scanned page preview"
        class="h-24 w-auto max-w-[200px] rounded-lg border object-cover"
        :class="isDark ? 'border-white/10' : 'border-gray-200'"
      >
      <span class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-500'">Last scan preview</span>
    </div>
  </section>
</template>
