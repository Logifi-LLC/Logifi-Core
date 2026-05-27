<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

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
const uploading = ref(false)
const uploadMessage = ref<string | null>(null)
const previewUrl = ref<string | null>(null)

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

async function uploadWithRetry(file: File): Promise<void> {
  const attempts = [0, 600, 1400]
  let lastError: unknown = null
  for (const delay of attempts) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    try {
      const form = new FormData()
      form.append('token', token.value)
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

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !sessionActive.value) return
  uploading.value = true
  uploadMessage.value = null
  try {
    const optimized = await optimizePhoto(file)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(optimized)
    await uploadWithRetry(optimized)
    uploadMessage.value = 'Uploaded. Your laptop should update instantly.'
  } catch (error: unknown) {
    uploadMessage.value =
      (error as { data?: { statusMessage?: string } })?.data?.statusMessage ??
      'Upload failed. Please try again.'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  validateToken()
})
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
    <div class="mx-auto max-w-md space-y-4">
      <h1 class="text-xl font-semibold">Logifi phone capture</h1>
      <p class="text-sm text-slate-300">
        Take a photo and upload it directly to your active Digifi session.
      </p>

      <div class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <p v-if="checking" class="text-sm text-slate-300">Checking session…</p>
        <p v-else-if="sessionError" class="text-sm text-rose-300">{{ sessionError }}</p>
        <template v-else>
          <label class="block">
            <span class="sr-only">Capture photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              class="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white"
              :disabled="uploading"
              @change="onFileSelected"
            >
          </label>
          <p class="text-xs text-slate-400">Photos are compressed before upload for faster transfer.</p>
        </template>
      </div>

      <p v-if="uploading" class="text-sm text-blue-300">Uploading…</p>
      <p v-else-if="uploadMessage" class="text-sm" :class="uploadMessage.startsWith('Uploaded') ? 'text-emerald-300' : 'text-rose-300'">
        {{ uploadMessage }}
      </p>

      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Latest captured photo"
        class="w-full rounded-xl border border-white/10"
      >
    </div>
  </main>
</template>
