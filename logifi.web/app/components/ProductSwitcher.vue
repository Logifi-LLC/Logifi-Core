<template>
  <div class="inline-flex rounded-xl border shadow-sm overflow-hidden font-quicksand" :class="borderClass">
    <NuxtLink
      to="/"
      :class="[
        'px-6 py-2.5 text-sm font-bold transition-all',
        activeProduct === 'logifi'
          ? 'bg-blue-600 text-white'
          : isDark
          ? 'bg-white/5 hover:bg-white/10 text-gray-300'
          : 'bg-white hover:bg-gray-50 text-gray-700'
      ]"
    >
      Logifi
    </NuxtLink>
    <NuxtLink
      to="/digifi"
      :class="[
        'px-6 py-2.5 text-sm font-bold transition-all border-l',
        activeProduct === 'digifi'
          ? 'bg-blue-600 text-white border-blue-500'
          : isDark
          ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
      ]"
    >
      Digifi
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activeProduct: 'logifi' | 'digifi'
  isDark?: boolean
}>()

const borderClass = computed(() => {
  return props.isDark
    ? 'border-white/10'
    : 'border-gray-200'
})
</script>
