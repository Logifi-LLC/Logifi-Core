<template>
  <svg
    :class="['loading-animation__mark', 'loading-animation__mark--square', markSizeClass]"
    :width="pixelSize"
    :height="pixelSize"
    :viewBox="`0 0 ${vb.width} ${vb.height}`"
    overflow="visible"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g class="loading-animation__stage">
      <g class="loading-animation__motion loading-animation__motion--bl loading-animation__corner loading-animation__corner--bl">
        <path :d="blPath" fill="#FFFFFF" />
      </g>
      <g class="loading-animation__motion loading-animation__motion--tr loading-animation__corner loading-animation__corner--tr">
        <path :d="trPath" fill="#FFFFFF" />
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import {
  OFFICIAL_MARK_BL_PATH,
  OFFICIAL_MARK_TR_PATH,
  OFFICIAL_MARK_VIEWBOX,
} from './loadingAnimationMarkGeometry'

defineProps<{
  pixelSize: number
  markSizeClass: string
}>()

const vb = OFFICIAL_MARK_VIEWBOX
const blPath = OFFICIAL_MARK_BL_PATH
const trPath = OFFICIAL_MARK_TR_PATH
</script>
