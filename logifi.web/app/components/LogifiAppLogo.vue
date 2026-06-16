<template>
  <img
    src="/images/app-logo-mark.png"
    :alt="alt"
    :class="['inline-block shrink-0 rounded-lg object-cover', sizeClass]"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    alt?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { alt: 'Logifi', size: 'md' }
)

const sizeClass = computed(
  () =>
    ({
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16',
    })[props.size]
)
</script>
