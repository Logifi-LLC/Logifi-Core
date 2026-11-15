<template>
  <svg
    :class="['loading-animation__mark', 'loading-animation__mark--square', markSizeClass]"
    :width="pixelSize"
    :height="svgHeight"
    :viewBox="`0 0 ${vb.width} ${vb.height}`"
    overflow="visible"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g class="loading-animation__stage">
      <g
        class="loading-animation__pivot"
        :transform="`translate(${pivotBl.x} ${pivotBl.y})`"
      >
        <g class="loading-animation__motion loading-animation__motion--bl loading-animation__corner loading-animation__corner--bl">
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
        :transform="`translate(${pivotTr.x} ${pivotTr.y})`"
      >
        <g class="loading-animation__motion loading-animation__motion--tr loading-animation__corner loading-animation__corner--tr">
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
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  MARK_BL_PIVOT,
  MARK_BL_RECTS_LOCAL,
  MARK_TR_PIVOT,
  MARK_TR_RECTS_LOCAL,
  MARK_VIEWBOX,
} from './loadingAnimationMarkGeometry'

const props = defineProps<{
  pixelSize: number
  markSizeClass: string
}>()

const vb = MARK_VIEWBOX
const pivotBl = MARK_BL_PIVOT
const pivotTr = MARK_TR_PIVOT
const blRects = MARK_BL_RECTS_LOCAL
const trRects = MARK_TR_RECTS_LOCAL

const svgHeight = computed(() =>
  Math.round(props.pixelSize * (vb.height / vb.width))
)
</script>
