<template>
  <div
    class="relative min-h-screen overflow-x-hidden bg-[#0a0e1a] font-quicksand text-gray-100 selection:bg-blue-900/50 dark:bg-[#0a0e1a] dark:text-gray-100"
  >
    <!-- Subtle grid background pattern -->
    <div class="fixed inset-0 z-0 opacity-[0.02]" style="background-image: linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px); background-size: 40px 40px;"></div>
    
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Dark cockpit aesthetic for all marketing secondary pages
</script>
