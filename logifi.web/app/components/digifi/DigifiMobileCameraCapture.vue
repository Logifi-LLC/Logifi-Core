<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useTheme } from '~/composables/useTheme'

defineProps<{
  disabled?: boolean
  shutterLabel?: string
}>()

const emit = defineEmits<{
  capture: [file: File]
  cancel: []
}>()

const { isDark: isDarkMode } = useTheme()

const videoRef = ref<HTMLVideoElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const stream = ref<MediaStream | null>(null)
const cameraError = ref<string | null>(null)
const capturing = ref(false)

async function startCamera() {
  cameraError.value = null
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Camera not available in this browser.'
    return
  }
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    stream.value = media
    const video = videoRef.value
    if (video) {
      video.srcObject = media
      await video.play()
    }
  } catch {
    cameraError.value = 'Could not open the camera. Use a photo from your library instead.'
  }
}

function stopCamera() {
  stream.value?.getTracks().forEach((track) => track.stop())
  stream.value = null
  const video = videoRef.value
  if (video) video.srcObject = null
}

async function takePhoto() {
  const video = videoRef.value
  if (!video || capturing.value || video.videoWidth === 0) {
    fileInputRef.value?.click()
    return
  }
  capturing.value = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not capture frame')
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) throw new Error('Could not save photo')
    emit('capture', new File([blob], `digifi-${Date.now()}.jpg`, { type: 'image/jpeg' }))
  } catch {
    fileInputRef.value?.click()
  } finally {
    capturing.value = false
  }
}

function onLibraryFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('capture', file)
}

onMounted(() => {
  void startCamera()
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 top-[calc(3rem+env(safe-area-inset-top))] z-40 flex flex-col bg-black"
    role="region"
    aria-label="Camera capture"
  >
    <video
      ref="videoRef"
      playsinline
      muted
      class="absolute inset-0 h-full w-full object-cover"
    />

    <div class="pointer-events-none absolute inset-0">
      <div class="absolute inset-x-0 top-[32%] h-px bg-white/50" aria-hidden="true" />
      <div class="absolute inset-x-0 top-[68%] h-px bg-white/50" aria-hidden="true" />
      <div
        class="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"
        aria-hidden="true"
      />
      <p class="absolute inset-x-4 bottom-36 text-center text-sm font-semibold text-white">
        Keep the page level and fill the view
      </p>
      <p class="absolute inset-x-4 bottom-[8.25rem] text-center text-xs text-white/70">Hold steady in good light</p>
    </div>

    <p
      v-if="cameraError"
      class="relative z-10 mx-4 mt-3 rounded-xl px-3 py-2 text-center text-xs"
      :class="isDarkMode ? 'bg-rose-950/80 text-rose-200' : 'bg-rose-100 text-rose-800'"
    >
      {{ cameraError }}
    </p>

    <div
      class="relative z-10 flex shrink-0 items-center gap-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
    >
      <button
        type="button"
        class="min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-white/90"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="min-h-[52px] flex-1 rounded-2xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="disabled || capturing"
        @click="takePhoto"
      >
        {{ capturing ? 'Saving…' : (shutterLabel ?? 'Capture page') }}
      </button>
      <button
        type="button"
        class="min-h-[48px] rounded-xl px-3 py-3 text-xs font-semibold text-white/80 underline-offset-2 hover:underline"
        @click="fileInputRef?.click()"
      >
        Library
      </button>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onLibraryFile"
    >
  </div>
</template>
