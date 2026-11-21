<template>
  <div
    :class="[
      'loading-animation',
      'loading-animation--motion',
      `loading-animation--variant-${variant}`,
      fullscreen ? 'loading-animation--fullscreen' : 'loading-animation--inline',
    ]"
    role="status"
    aria-busy="true"
    :aria-label="resolvedLabel"
  >
    <LoadingAnimationPropellerMark
      v-if="variant === 'propeller'"
      :pixel-size="pixelSize"
      :mark-size-class="markSizeClass"
    />
    <LoadingAnimationWordmarkMark
      v-else
      :pixel-size="pixelSize"
      :mark-size-class="markSizeClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingAnimationPropellerMark from './loading/LoadingAnimationPropellerMark.vue'
import LoadingAnimationWordmarkMark from './loading/LoadingAnimationWordmarkMark.vue'

export type LoadingAnimationSize = 'sm' | 'md' | 'lg'
export type LoadingAnimationVariant = 'propeller' | 'wordmark'

const props = withDefaults(
  defineProps<{
    size?: LoadingAnimationSize
    label?: string
    fullscreen?: boolean
    variant?: LoadingAnimationVariant
  }>(),
  {
    size: 'md',
    label: undefined,
    fullscreen: true,
    variant: 'propeller',
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
const variant = computed(() => props.variant)
</script>