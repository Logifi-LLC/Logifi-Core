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
const triedRawFallback = ref(false)

watch(
  () => props.src,
  async (url) => {
    loadState.value = 'loading'
    triedRawFallback.value = false
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

function onLoad(): void {
  loadState.value = 'ready'
}

function onError(): void {
  if (
    !triedRawFallback.value &&
    props.src &&
    displaySrc.value &&
    displaySrc.value !== props.src
  ) {
    triedRawFallback.value = true
    displaySrc.value = props.src
    loadState.value = 'loading'
    return
  }
  loadState.value = 'error'
}
</script>

<template>
  <div class="min-h-[6rem]">
    <img
      v-show="loadState !== 'error' && displaySrc"
      :key="displaySrc"
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