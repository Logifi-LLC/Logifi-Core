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

function onLoad(): void {
  loadState.value = 'ready'
}

function onError(): void {
  loadState.value = 'error'
}
</script>

<template>
  <div class="min-h-[2.5rem]">
    <img
      v-show="loadState !== 'error'"
      :src="src"
      :alt="alt"
      class="block max-h-36 w-full max-w-md object-contain object-left"
      :class="isDarkMode ? 'invert' : 'brightness-0'"
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