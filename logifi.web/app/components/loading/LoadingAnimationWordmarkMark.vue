<template>
  <svg
    :class="['loading-animation__mark', 'loading-animation__mark--wordmark', markSizeClass]"
    :width="svgWidth"
    :height="pixelSize"
    viewBox="0 0 240 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g class="loading-animation__wordmark">
      <g transform="translate(4, 52)">
        <g class="loading-animation__corner loading-animation__corner--bl-wordmark">
          <g transform="scale(0.36)">
            <rect x="0" y="33" width="10" height="64" fill="#ffffff" />
            <rect x="0" y="90" width="87" height="10" fill="#ffffff" />
          </g>
        </g>
      </g>
      <text
        class="loading-animation__word"
        x="120"
        y="62"
        text-anchor="middle"
        fill="#ffffff"
      >
        logifi
      </text>
      <g transform="translate(204, 4)">
        <g class="loading-animation__corner loading-animation__corner--tr-wordmark">
          <g transform="scale(0.36)">
            <rect x="14" y="0" width="86" height="10" fill="#ffffff" />
            <rect x="90" y="0" width="10" height="67" fill="#ffffff" />
          </g>
        </g>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  pixelSize: number
  markSizeClass: string
}>()

const WORDMARK_ASPECT = 240 / 100

const svgWidth = computed(() => Math.round(props.pixelSize * WORDMARK_ASPECT))
</script>