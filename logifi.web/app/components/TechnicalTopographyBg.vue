<template>
  <!-- Sits under content (z-0); parent should be position:relative and min-h-screen -->
  <div class="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <!-- Soft color washes (read on light mint #e4e8e7) -->
    <div
      class="absolute -left-[20%] -top-[25%] h-[min(90vh,780px)] w-[min(92vw,780px)] rounded-full bg-blue-400/14 blur-[128px]"
    />
    <div
      class="absolute -bottom-[22%] -right-[18%] h-[min(82vh,680px)] w-[min(88vw,680px)] rounded-full bg-amber-300/18 blur-[112px]"
    />
    <!-- Subtle grid; radial mask: slightly stronger in center, fades toward edges -->
    <div
      class="absolute inset-0"
      :style="{
        backgroundImage: gridDataUrl,
        backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
        WebkitMaskImage: radialMask,
        maskImage: radialMask,
      }"
    />
  </div>
</template>

<script setup lang="ts">
/** Repeating cell: 0.5px stroke, slate at low opacity — readable on light mint */
const gridSizePx = 36
const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${gridSizePx}" height="${gridSizePx}" viewBox="0 0 ${gridSizePx} ${gridSizePx}"><path d="M ${gridSizePx} 0 L 0 0 0 ${gridSizePx}" fill="none" stroke="rgb(71 85 105)" stroke-opacity="0.07" stroke-width="0.5"/></svg>`
const gridDataUrl = `url("data:image/svg+xml,${encodeURIComponent(gridSvg)}")`

const radialMask =
  'radial-gradient(ellipse 72% 62% at 50% 44%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 78%)'
</script>
