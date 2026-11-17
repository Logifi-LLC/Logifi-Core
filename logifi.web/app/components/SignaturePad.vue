<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { buildExportCanvas } from '~/utils/signaturePadExport'
import { resolveSignaturePadCssSize } from '~/utils/signaturePadLayout'
import {
  dominantOrientationAngle,
  readScreenOrientationAngle,
} from '~/utils/signaturePadOrientation'

const LIGHT_INK = '#111827'
const DARK_INK = '#f9fafb'
const STROKE_WIDTH_CSS = 3

const props = withDefaults(
  defineProps<{
    isDarkMode?: boolean
    disabled?: boolean
    /** Fixed canvas height in CSS pixels when fillParent is false. */
    height?: number
    /** When true, canvas fills its parent element's client height. */
    fillParent?: boolean
    /** Hide the hint text + Clear button (caller provides chrome). */
    hideFooter?: boolean
  }>(),
  {
    isDarkMode: false,
    disabled: false,
    height: 160,
    fillParent: false,
    hideFooter: false,
  }
)

const emit = defineEmits<{
  change: [hasInk: boolean]
}>()

const frameRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const hasInk = ref(false)

let drawing = false
let lastX = 0
let lastY = 0
let ctx: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null
let resizeRaf = 0
let lastLayoutWidth = 0
let lastLayoutHeight = 0
const orientationSamples: number[] = []

function recordOrientationSample(): void {
  orientationSamples.push(readScreenOrientationAngle())
}

function resetOrientationSamples(): void {
  orientationSamples.length = 0
}

function screenInkColor(): string {
  return props.isDarkMode ? DARK_INK : LIGHT_INK
}

function applyStrokeStyle(): void {
  if (!ctx) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = STROKE_WIDTH_CSS
  ctx.strokeStyle = screenInkColor()
}

function measureFrame(): { width: number; height: number } | null {
  const frame = frameRef.value
  if (!frame) return null
  return resolveSignaturePadCssSize({
    fillParent: props.fillParent,
    frameWidth: frame.clientWidth,
    frameHeight: frame.clientHeight,
    fixedHeight: props.height,
  })
}

function scheduleResizeCanvas(): void {
  if (resizeRaf !== 0) return
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    resizeCanvas()
  })
}

function resizeCanvas(): void {
  const canvas = canvasRef.value
  const frame = frameRef.value
  if (!canvas || !frame) return

  const size = measureFrame()
  if (!size) return

  const { width, height } = size
  if (width === lastLayoutWidth && height === lastLayoutHeight && canvas.width > 0) {
    return
  }
  lastLayoutWidth = width
  lastLayoutHeight = height

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const snapshot = hasInk.value && canvas.width > 0 && canvas.height > 0
    ? canvas.toDataURL('image/png')
    : null

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.removeProperty('width')
  canvas.style.removeProperty('height')
  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  applyStrokeStyle()

  if (snapshot) {
    const img = new Image()
    img.onload = () => {
      if (!ctx || canvasRef.value !== canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, width, height)
      hasInk.value = true
      emit('change', true)
      applyStrokeStyle()
    }
    img.src = snapshot
  } else {
    hasInk.value = false
    emit('change', false)
  }
}

function pointerPos(e: PointerEvent): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function onPointerDown(e: PointerEvent): void {
  if (props.disabled || !ctx) return
  e.preventDefault()
  canvasRef.value?.setPointerCapture(e.pointerId)
  drawing = true
  recordOrientationSample()
  const p = pointerPos(e)
  lastX = p.x
  lastY = p.y
}

function onPointerMove(e: PointerEvent): void {
  if (!drawing || !ctx || props.disabled) return
  e.preventDefault()
  recordOrientationSample()
  const p = pointerPos(e)
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  lastX = p.x
  lastY = p.y
  if (!hasInk.value) {
    hasInk.value = true
    emit('change', true)
  }
}

function onPointerUp(e: PointerEvent): void {
  if (!drawing) return
  drawing = false
  e.preventDefault()
  try {
    canvasRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    // ignore
  }
}

function clear(): void {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  hasInk.value = false
  resetOrientationSamples()
  emit('change', false)
}

async function toBlob(mimeType = 'image/png'): Promise<Blob | null> {
  const canvas = canvasRef.value
  if (!canvas || !hasInk.value) return null
  const exportCanvas = buildExportCanvas(canvas, {
    captureOrientationDegrees: dominantOrientationAngle(orientationSamples),
  })
  return new Promise((resolve) => {
    exportCanvas.toBlob((blob) => resolve(blob), mimeType)
  })
}

defineExpose({
  clear,
  toBlob,
  hasInk,
  resize: resizeCanvas,
})

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', scheduleResizeCanvas)
  const frame = frameRef.value
  if (frame && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      scheduleResizeCanvas()
    })
    resizeObserver.observe(frame)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleResizeCanvas)
  if (resizeRaf !== 0) {
    cancelAnimationFrame(resizeRaf)
    resizeRaf = 0
  }
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => [props.isDarkMode, props.height, props.fillParent] as const,
  () => {
    lastLayoutWidth = 0
    lastLayoutHeight = 0
    scheduleResizeCanvas()
  }
)
</script>

<template>
  <div :class="['space-y-2', fillParent ? 'flex h-full min-h-0 flex-col' : '']">
    <div
      ref="frameRef"
      data-signature-pad-frame
      :class="[
        'rounded-lg border overflow-hidden touch-none select-none bg-transparent',
        fillParent ? 'min-h-0 w-full flex-1' : 'w-full max-w-full',
        isDarkMode ? 'border-gray-600' : 'border-gray-300',
        disabled ? 'opacity-60 pointer-events-none' : '',
      ]"
      :style="fillParent ? { touchAction: 'none' } : { touchAction: 'none', height: `${height}px` }"
      @touchmove.prevent
    >
      <canvas
        ref="canvasRef"
        class="block h-full w-full cursor-crosshair bg-transparent"
        style="touch-action: none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
    </div>
    <div
      v-if="!hideFooter"
      class="flex items-center justify-between gap-2"
    >
      <p :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
        {{ hasInk ? 'Signature captured' : 'Sign above with finger or stylus' }}
      </p>
      <button
        type="button"
        class="text-xs font-semibold underline-offset-2 hover:underline disabled:opacity-50"
        :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
        :disabled="disabled || !hasInk"
        @click="clear"
      >
        Clear
      </button>
    </div>
  </div>
</template>