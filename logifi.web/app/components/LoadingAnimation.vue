<template>
  <div
    :class="[
      'loading-animation',
      fullscreen ? 'loading-animation--fullscreen' : 'loading-animation--inline',
    ]"
    role="status"
    aria-busy="true"
    :aria-label="resolvedLabel"
  >
    <img
      src="/images/app-logo-mark.png"
      alt=""
      :class="['loading-animation__mark', markSizeClass]"
      :width="pixelSize"
      :height="pixelSize"
      decoding="async"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type LoadingAnimationSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    /** Logo mark size token */
    size?: LoadingAnimationSize
    /** Accessible status label (defaults to “Loading”) */
    label?: string
    /** Full-viewport boot overlay vs centered inline block */
    fullscreen?: boolean
  }>(),
  {
    size: 'md',
    label: undefined,
    fullscreen: true,
  }
)

const SIZE_PX: Record<LoadingAnimationSize, number> = {
  sm: 48,
  md: 72,
  lg: 96,
}

const pixelSize = computed(() => SIZE_PX[props.size])
const markSizeClass = computed(() => `loading-animation__mark--${props.size}`)
const resolvedLabel = computed(() => props.label ?? 'Loading')
</script>