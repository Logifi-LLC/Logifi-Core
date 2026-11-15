<template>
  <svg
    :class="['loading-animation__mark', 'loading-animation__mark--square', markSizeClass]"
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
</template>

<script setup lang="ts">
defineProps<{
  pixelSize: number
  markSizeClass: string
}>()
</script>