<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { DigifiPageSide } from '~/utils/digifiTypes'

interface SessionStatusResponse {
  ok: true
  sessionId: string
  isActive: boolean
  expiresAt: string
}

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))
const checking = ref(true)
const sessionActive = ref(false)
const sessionError = ref<string | null>(null)
const uploadingSide = ref<DigifiPageSide | null>(null)
const uploadMessage = ref<string | null>(null)
const lastPreviewBySide = ref<Partial<Record<DigifiPageSide, string>>>({})

const leftInputRef = ref<HTMLInputElement | null>(null)
const rightInputRef = ref<HTMLInputElement | null>(null)

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
    const response = await $fetch<SessionStatusResponse>(`/api/digifi/capture/session/${token.value}`)
    sessionActive.value = response.isActive
    if (!response.isActive) {
      sessionError.value = 'This capture session is closed or expired.'
    }
  } catch (error: unknown) {
    sessionActive.value = false
    sessionError.value = (error as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not validate capture session.'
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
      await $fetch('/api/digifi/capture/upload', {
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

function openCapture(pageSide: DigifiPageSide) {
  if (!sessionActive.value || uploadingSide.value) return
  const input = pageSide === 'left' ? leftInputRef.value : rightInputRef.value
  input?.click()
}

async function onFileSelected(pageSide: DigifiPageSide, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
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

function zoneClasses(pageSide: DigifiPageSide): string[] {
  const busy = uploadingSide.value === pageSide
  const base = [
    'rounded-2xl border-2 p-4 space-y-3 transition-colors',
    busy ? 'border-blue-400 bg-blue-500/15' : 'border-white/15 bg-white/5',
  ]
  if (pageSide === 'left' && !busy) {
    base.push('ring-1 ring-blue-500/30')
  }
  if (pageSide === 'right' && !busy) {
    base.push('ring-1 ring-violet-500/30')
  }
  return base
}

onMounted(() => {
  validateToken()
})
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 font-quicksand">
    <div class="mx-auto max-w-md space-y-5">
      <header class="space-y-1">
        <h1 class="text-xl font-semibold">Logifi phone capture</h1>
        <p class="text-sm text-slate-300">
          Choose which logbook page you are photographing, then take the picture.
        </p>
      </header>

      <div v-if="checking" class="text-sm text-slate-300">Checking session…</div>
      <p v-else-if="sessionError" class="text-sm text-rose-300">{{ sessionError }}</p>

      <template v-else>
        <input
          ref="leftInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          @change="onFileSelected('left', $event)"
        >
        <input
          ref="rightInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          @change="onFileSelected('right', $event)"
        >

        <!-- Left page -->
        <section :class="zoneClasses('left')" aria-labelledby="capture-left-heading">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p id="capture-left-heading" class="text-base font-semibold text-blue-200">
                1. Left page
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                Photo of the left side of your open logbook spread
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-200">
              LEFT
            </span>
          </div>

          <button
            type="button"
            class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="!!uploadingSide"
            @click="openCapture('left')"
          >
            {{ uploadingSide === 'left' ? 'Uploading left page…' : 'Take photo — left page' }}
          </button>

          <img
            v-if="lastPreviewBySide.left"
            :src="lastPreviewBySide.left"
            alt="Last left page capture"
            class="w-full rounded-lg border border-blue-500/30"
          >
        </section>

        <!-- Right page -->
        <section :class="zoneClasses('right')" aria-labelledby="capture-right-heading">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p id="capture-right-heading" class="text-base font-semibold text-violet-200">
                2. Right page
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                Photo of the right side of your open logbook spread
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
              RIGHT
            </span>
          </div>

          <button
            type="button"
            class="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="!!uploadingSide"
            @click="openCapture('right')"
          >
            {{ uploadingSide === 'right' ? 'Uploading right page…' : 'Take photo — right page' }}
          </button>

          <img
            v-if="lastPreviewBySide.right"
            :src="lastPreviewBySide.right"
            alt="Last right page capture"
            class="w-full rounded-lg border border-violet-500/30"
          >
        </section>

        <p class="text-xs text-slate-500 text-center">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>
      </template>

      <p
        v-if="uploadMessage"
        class="text-sm text-center"
        :class="uploadMessage.includes('uploaded') ? 'text-emerald-300' : 'text-rose-300'"
      >
        {{ uploadMessage }}
      </p>
    </div>
  </main>
</template>
