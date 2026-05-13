<template>
  <div
    class="relative min-h-screen overflow-x-hidden bg-[#e4e8e7] font-quicksand text-gray-900 selection:bg-blue-200/70 dark:bg-[#e4e8e7] dark:text-gray-900"
  >
    <TechnicalTopographyBg />
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import TechnicalTopographyBg from '~/components/TechnicalTopographyBg.vue'
</script>
