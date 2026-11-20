<template>
  <svg
    :class="['loading-animation__mark', 'loading-animation__mark--wordmark', markSizeClass]"
    :width="pixelSize"
    :height="pixelSize"
    viewBox="0 0 1024 1024"
    overflow="visible"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g class="loading-animation__wordmark-image">
      <path
        v-for="(p, i) in letters"
        :key="`letter-${i}`"
        :d="p.d"
        :transform="p.transform"
        fill="#FFFFFF"
      />
    </g>
    <g
      class="loading-animation__motion loading-animation__motion--bl-wordmark loading-animation__corner loading-animation__corner--bl-wordmark"
    >
      <path :d="bl.d" :transform="bl.transform" fill="#FFFFFF" />
    </g>
    <g
      class="loading-animation__motion loading-animation__motion--tr-wordmark loading-animation__corner loading-animation__corner--tr-wordmark"
    >
      <path :d="tr.d" :transform="tr.transform" fill="#FFFFFF" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import logoSvg from '../../../public/images/logifi-logo.svg?raw'

defineProps<{
  pixelSize: number
  markSizeClass: string
}>()

/** Bracket paths in logifi-logo.svg, split from the letter paths. */
const BRACKET_BL = 'translate(194,405)'
const BRACKET_TR = 'translate(634,315)'

type LogoPath = { d: string; transform: string }

function parseLogoPaths(svg: string): LogoPath[] {
  const paths: LogoPath[] = []
  for (const match of svg.matchAll(/<path\b([^>]*)\/?>/g)) {
    const attrs = match[1] ?? ''
    const d = attrs.match(/\bd="([^"]*)"/)?.[1]
    const transform = attrs.match(/\btransform="([^"]*)"/)?.[1]
    if (d && transform) paths.push({ d, transform })
  }
  return paths
}

const paths = parseLogoPaths(logoSvg)
const letters = paths.filter((p) => p.transform !== BRACKET_BL && p.transform !== BRACKET_TR)
const bl = paths.find((p) => p.transform === BRACKET_BL)!
const tr = paths.find((p) => p.transform === BRACKET_TR)!
</script>
