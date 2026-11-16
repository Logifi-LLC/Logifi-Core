<script setup lang="ts">
withDefaults(
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
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    class="block max-h-36 w-full max-w-md object-contain object-left"
    :class="isDarkMode ? 'invert' : ''"
  />
</template>