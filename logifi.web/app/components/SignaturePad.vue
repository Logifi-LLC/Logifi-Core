<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const EXPORT_INK_RGB = { r: 0x11, g: 0x18, b: 0x27 }
const LIGHT_INK = '#111827'
const DARK_INK = '#f9fafb'
const SIGNATURE_ASPECT = 0.45
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

const canvasRef = ref<HTMLCanvasElement | null>(null)
const hasInk = ref(false)

let drawing = false
let lastX = 0
let lastY = 0
let ctx: CanvasRenderingContext2D | null = null

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

function signatureCanvasHeight(parentHeight: number, width: number): number {
  if (!props.fillParent) return props.height
  const landscapeCap = Math.max(120, Math.round(width * SIGNATURE_ASPECT))
  const available = Math.max(160, parentHeight)
  return Math.min(available, landscapeCap)
}

function cropInkToCanvas(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const readCtx = source.getContext('2d')
  if (!readCtx) return null
  const w = source.width
  const h = source.height
  if (w <= 0 || h <= 0) return null
  const imageData = readCtx.getImageData(0, 0, w, h)
  const { data } = imageData
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  const alphaThreshold = 12
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const alpha = data[(y * w + x) * 4 + 3]
      if (alpha <= alphaThreshold) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null

  const pad = Math.max(4, Math.round(8 * dpr))
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const out = document.createElement('canvas')
  out.width = cropW
  out.height = cropH
  const outCtx = out.getContext('2d')
  if (!outCtx) return null
  outCtx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
  return out
}

function canonicalizeExportInk(canvas: HTMLCanvasElement): void {
  const exportCtx = canvas.getContext('2d')
  if (!exportCtx) return
  const { width, height } = canvas
  const imageData = exportCtx.getImageData(0, 0, width, height)
  const { data } = imageData
  const alphaThreshold = 12
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha <= alphaThreshold) {
      data[i + 3] = 0
      continue
    }
    data[i] = EXPORT_INK_RGB.r
    data[i + 1] = EXPORT_INK_RGB.g
    data[i + 2] = EXPORT_INK_RGB.b
  }
  exportCtx.putImageData(imageData, 0, 0)
}

function buildExportCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const cropped = cropInkToCanvas(source)
  const target = cropped ?? source
  canonicalizeExportInk(target)
  return target
}

function resizeCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  const width = Math.max(280, parent?.clientWidth ?? 320)
  const height = signatureCanvasHeight(parent?.clientHeight ?? props.height, width)
  if (width <= 0 || height <= 0) return

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const snapshot = hasInk.value && canvas.width > 0 && canvas.height > 0
    ? canvas.toDataURL('image/png')
    : null

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
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
  const p = pointerPos(e)
  lastX = p.x
  lastY = p.y
}

function onPointerMove(e: PointerEvent): void {
  if (!drawing || !ctx || props.disabled) return
  e.preventDefault()
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
  emit('change', false)
}

async function toBlob(mimeType = 'image/png'): Promise<Blob | null> {
  const canvas = canvasRef.value
  if (!canvas || !hasInk.value) return null
  const exportCanvas = buildExportCanvas(canvas)
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
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
})

watch(
  () => [props.isDarkMode, props.height, props.fillParent] as const,
  () => {
    resizeCanvas()
  }
)
</script>

<template>
  <div :class="['space-y-2', fillParent ? 'flex h-full min-h-0 flex-col' : '']">
    <div
      :class="[
        'rounded-lg border overflow-hidden touch-none select-none bg-transparent',
        fillParent ? 'min-h-0 flex-1 flex items-stretch justify-center' : '',
        isDarkMode ? 'border-gray-600' : 'border-gray-300',
        disabled ? 'opacity-60 pointer-events-none' : '',
      ]"
    >
      <canvas
        ref="canvasRef"
        class="block w-full cursor-crosshair bg-transparent"
        :class="fillParent ? 'max-h-full' : ''"
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