<template>
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
  >
    <!-- Top-left corner bracket -->
    <path
      d="M 15 15 L 15 40 M 15 15 L 40 15"
      stroke="currentColor"
      stroke-width="8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    
    <!-- Bottom-right corner bracket -->
    <path
      d="M 85 85 L 85 60 M 85 85 L 60 85"
      stroke="currentColor"
      stroke-width="8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number | string
}>()
</script>
