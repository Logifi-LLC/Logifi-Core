<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    isDarkMode?: boolean
    alt?: string
  }>(),
  {
    isDarkMode: false,
    alt: 'Instructor signature',
  }
)

const loadState = ref<'loading' | 'ready' | 'error'>('loading')

watch(
  () => props.src,
  () => {
    loadState.value = 'loading'
  },
  { immediate: true }
)

function onLoad(e: Event): void {
  loadState.value = 'ready'
  const img = e.target as HTMLImageElement
  if (import.meta.client) {
    console.info('[drawn-sig-img]', {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    })
  }
}

function onError(): void {
  loadState.value = 'error'
  if (import.meta.client) {
    console.info('[drawn-sig-img]', { error: true })
  }
}
</script>

<template>
  <div class="min-h-[4.5rem]">
    <img
      v-show="loadState !== 'error'"
      :src="src"
      :alt="alt"
      class="block h-28 w-auto max-w-full object-contain object-left"
      :class="isDarkMode ? 'invert' : ''"
      @load="onLoad"
      @error="onError"
    />
    <p
      v-if="loadState === 'error'"
      :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-500']"
    >
      Signature image unavailable
    </p>
  </div>
</template>