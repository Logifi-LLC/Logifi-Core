<template>
  <svg
    :class="['loading-animation__mark', 'loading-animation__mark--wordmark', markSizeClass]"
    :width="pixelSize"
    :height="pixelSize"
    :viewBox="`0 0 ${canvas.width} ${canvas.height}`"
    overflow="visible"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    aria-hidden="true"
    focusable="false"
  >
    <image
      class="loading-animation__wordmark-image"
      href="/images/logifi-logo.png"
      :width="canvas.width"
      :height="canvas.height"
      preserveAspectRatio="xMidYMid meet"
    />
    <g
      class="loading-animation__pivot"
      :transform="`translate(${lockupBl.x} ${lockupBl.y})`"
    >
      <g class="loading-animation__motion loading-animation__motion--bl-wordmark loading-animation__corner loading-animation__corner--bl-wordmark">
        <rect
          v-for="(r, i) in blRects"
          :key="`bl-${i}`"
          :x="r.x"
          :y="r.y"
          :width="r.w"
          :height="r.h"
          fill="#ffffff"
        />
      </g>
    </g>
    <g
      class="loading-animation__pivot"
      :transform="`translate(${lockupTr.x} ${lockupTr.y})`"
    >
      <g class="loading-animation__motion loading-animation__motion--tr-wordmark loading-animation__corner loading-animation__corner--tr-wordmark">
        <rect
          v-for="(r, i) in trRects"
          :key="`tr-${i}`"
          :x="r.x"
          :y="r.y"
          :width="r.w"
          :height="r.h"
          fill="#ffffff"
        />
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import {
  MARK_BL_RECTS_LOCAL,
  MARK_TR_RECTS_LOCAL,
  WORDMARK_CANVAS,
  WORDMARK_LOCKUP_BL,
  WORDMARK_LOCKUP_TR,
} from './loadingAnimationMarkGeometry'

defineProps<{
  pixelSize: number
  markSizeClass: string
}>()

const canvas = WORDMARK_CANVAS
const lockupBl = WORDMARK_LOCKUP_BL
const lockupTr = WORDMARK_LOCKUP_TR
const blRects = MARK_BL_RECTS_LOCAL
const trRects = MARK_TR_RECTS_LOCAL
</script>
