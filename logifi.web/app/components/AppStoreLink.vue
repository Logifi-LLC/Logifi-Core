<template>
  <a
    v-if="show"
    :href="APP_STORE_URL"
    target="_blank"
    rel="noopener noreferrer"
    :class="linkClass"
    :aria-label="variant === 'header' ? 'App Store' : undefined"
  >
    <Icon v-if="variant !== 'footer'" name="ri:apple-fill" :size="iconSize" aria-hidden="true" />
    <span :class="variant === 'header' ? 'hidden lg:inline' : undefined">App Store</span>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { APP_STORE_URL } from '../../shared/publicSeo'

const props = defineProps<{
  variant: 'hero' | 'header' | 'menu' | 'footer'
}>()

const show = computed(() => !isCapacitorNative())

const iconSize = computed(() => (props.variant === 'hero' ? 22 : props.variant === 'menu' ? 18 : 16))

const linkClass = computed(() => {
  if (props.variant === 'hero') {
    return 'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gray-800 text-gray-100 text-lg font-bold rounded-lg border border-gray-700 hover:bg-gray-700 hover:border-gray-600 transition-all active:scale-[0.98]'
  }
  if (props.variant === 'header') {
    return 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2.5 text-sm font-bold rounded-lg border border-gray-700 text-gray-100 hover:bg-gray-800 transition-all active:scale-[0.98] lg:px-4 xl:px-5'
  }
  if (props.variant === 'menu') {
    return 'inline-flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-gray-200 rounded-lg border border-gray-700/50 bg-gray-800/50 hover:bg-gray-800/70 transition-colors'
  }
  return 'text-sm font-medium text-gray-400 hover:text-blue-400 transition-[color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 rounded'
})
</script>
