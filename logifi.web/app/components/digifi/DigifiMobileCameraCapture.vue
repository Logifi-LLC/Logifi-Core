<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  disabled?: boolean
  shutterLabel?: string
  /** 1-based step when capturing a two-page spread (e.g. 1 = left, 2 = right). */
  twoPageStep?: 1 | 2 | null
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

const progressLine = computed(() => {
  if (props.twoPageStep == null) return null
  return `Page ${props.twoPageStep} of 2`
})

async function applyMaxPhotoResolution(track: MediaStreamTrack) {
  const caps = track.getCapabilities?.()
  if (!caps?.width?.max || !caps.height?.max) return
  try {
    await track.applyConstraints({
      width: { ideal: caps.width.max },
      height: { ideal: caps.height.max },
    })
  } catch {
    // Keep the stream from getUserMedia if the device rejects a max-size request.
  }
}

async function startCamera() {
  cameraError.value = null
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Camera not available in this browser.'
    return
  }
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 3840, min: 1280 },
        height: { ideal: 2160, min: 720 },
      },
      audio: false,
    })
    const track = media.getVideoTracks()[0]
    if (track) {
      await applyMaxPhotoResolution(track)
    }
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
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
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

    <p
      v-if="cameraError"
      class="relative z-10 mx-4 mt-3 rounded-xl px-3 py-2 text-center text-xs"
      :class="isDarkMode ? 'bg-rose-950/80 text-rose-200' : 'bg-rose-100 text-rose-800'"
    >
      {{ cameraError }}
    </p>

    <div
      class="relative z-10 mt-auto flex flex-col items-center gap-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4"
    >
      <p v-if="progressLine" class="text-xs font-semibold uppercase tracking-wide text-white/80">
        {{ progressLine }}
      </p>
      <p class="text-center text-sm font-semibold text-white">
        {{ shutterLabel ?? 'Photograph page' }}
      </p>

      <div class="flex w-full max-w-md items-center justify-between gap-2">
        <button
          type="button"
          class="min-h-[48px] min-w-[4.5rem] rounded-xl px-3 py-3 text-sm font-semibold text-white/90"
          @click="emit('cancel')"
        >
          Cancel
        </button>

        <button
          type="button"
          class="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-white/15 p-1 disabled:opacity-50"
          :disabled="disabled || capturing"
          aria-label="Take picture"
          @click="takePhoto"
        >
          <span class="block h-full w-full rounded-full bg-white" />
        </button>

        <button
          type="button"
          class="min-h-[48px] min-w-[4.5rem] rounded-xl px-2 py-3 text-xs font-semibold text-white/80 underline-offset-2 hover:underline"
          @click="fileInputRef?.click()"
        >
          Library
        </button>
      </div>

      <p class="text-center text-xs text-white/60">
        {{ capturing ? 'Saving…' : 'Tap the white button to take a photo' }}
      </p>
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
