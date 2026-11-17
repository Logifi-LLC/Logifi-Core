<script setup lang="ts">
import { ref, watch } from 'vue'
import { normalizeSignatureFromUrl } from '~/utils/signatureInkNormalize'

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
const displaySrc = ref('')

watch(
  () => props.src,
  async (url) => {
    loadState.value = 'loading'
    displaySrc.value = ''
    if (!url) {
      loadState.value = 'error'
      return
    }
    if (!import.meta.client) {
      displaySrc.value = url
      return
    }
    const normalized = await normalizeSignatureFromUrl(url)
    displaySrc.value = normalized ?? url
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
  if (displaySrc.value && displaySrc.value !== props.src) {
    displaySrc.value = props.src
    loadState.value = 'loading'
    return
  }
  loadState.value = 'error'
  if (import.meta.client) {
    console.info('[drawn-sig-img]', { error: true })
  }
}
</script>

<template>
  <div class="min-h-[6rem]">
    <img
      v-show="loadState !== 'error' && displaySrc"
      :src="displaySrc"
      :alt="alt"
      class="block max-h-24 max-w-[320px] w-auto h-auto object-contain object-left"
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