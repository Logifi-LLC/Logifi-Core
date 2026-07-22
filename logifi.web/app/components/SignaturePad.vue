<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

function applyStrokeStyle(): void {
  if (!ctx) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = props.fillParent ? 3 : 2.25
  ctx.strokeStyle = props.isDarkMode ? '#f3f4f6' : '#111827'
}

function resizeCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  const width = Math.max(280, parent?.clientWidth ?? 320)
  const height = props.fillParent
    ? Math.max(160, parent?.clientHeight ?? props.height)
    : props.height
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
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType)
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
        'rounded-lg border overflow-hidden touch-none select-none',
        fillParent ? 'min-h-0 flex-1' : '',
        isDarkMode ? 'border-gray-600 bg-gray-950' : 'border-gray-300 bg-white',
        disabled ? 'opacity-60 pointer-events-none' : '',
      ]"
    >
      <canvas
        ref="canvasRef"
        class="block w-full cursor-crosshair"
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
