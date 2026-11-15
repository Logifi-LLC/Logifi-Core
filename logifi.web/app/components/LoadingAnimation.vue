<template>
  <div
    :class="[
      'loading-animation',
      'loading-animation--motion',
      fullscreen ? 'loading-animation--fullscreen' : 'loading-animation--inline',
    ]"
    role="status"
    aria-busy="true"
    :aria-label="resolvedLabel"
  >
    <svg
      :class="['loading-animation__mark', markSizeClass]"
      :width="pixelSize"
      :height="pixelSize"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g class="loading-animation__stage">
        <g class="loading-animation__corner loading-animation__corner--bl">
          <rect x="0" y="33" width="10" height="64" fill="#ffffff" />
          <rect x="0" y="90" width="87" height="10" fill="#ffffff" />
        </g>
        <g class="loading-animation__corner loading-animation__corner--tr">
          <rect x="14" y="0" width="86" height="10" fill="#ffffff" />
          <rect x="90" y="0" width="10" height="67" fill="#ffffff" />
        </g>
      </g>
    </svg>
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