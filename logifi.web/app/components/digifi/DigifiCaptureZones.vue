<script setup lang="ts">
import { ref } from 'vue'
import type { DigifiPageSide } from '~/utils/digifiTypes'

const props = defineProps<{
  uploadingSide: DigifiPageSide | null
  lastPreviewBySide: Partial<Record<DigifiPageSide, string>>
  disabled?: boolean
}>()

const emit = defineEmits<{
  selectFile: [pageSide: DigifiPageSide, file: File]
}>()

const leftInputRef = ref<HTMLInputElement | null>(null)
const rightInputRef = ref<HTMLInputElement | null>(null)

function zoneClasses(pageSide: DigifiPageSide): string[] {
  const busy = props.uploadingSide === pageSide
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

function openCapture(pageSide: DigifiPageSide) {
  if (props.disabled || props.uploadingSide) return
  const input = pageSide === 'left' ? leftInputRef.value : rightInputRef.value
  input?.click()
}

function onFileSelected(pageSide: DigifiPageSide, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  emit('selectFile', pageSide, file)
}
</script>

<template>
  <div class="space-y-4">
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
        class="w-full min-h-[48px] rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="disabled || !!uploadingSide"
        @click="openCapture('left')"
      >
        {{ uploadingSide === 'left' ? 'Uploading left page…' : 'Take photo - left page' }}
      </button>

      <img
        v-if="lastPreviewBySide.left"
        :src="lastPreviewBySide.left"
        alt="Last left page capture"
        class="w-full rounded-lg border border-blue-500/30"
      >
    </section>

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
        class="w-full min-h-[48px] rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="disabled || !!uploadingSide"
        @click="openCapture('right')"
      >
        {{ uploadingSide === 'right' ? 'Uploading right page…' : 'Take photo - right page' }}
      </button>

      <img
        v-if="lastPreviewBySide.right"
        :src="lastPreviewBySide.right"
        alt="Last right page capture"
        class="w-full rounded-lg border border-violet-500/30"
      >
    </section>
  </div>
</template>
