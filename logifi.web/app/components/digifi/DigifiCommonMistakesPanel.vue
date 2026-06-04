<script setup lang="ts">
import { DIGIFI_COMMON_MISTAKE_CHECKLIST } from '~/utils/digifiCommonMistakes'

defineProps<{
  isDark?: boolean
}>()
</script>

<template>
  <div
    class="rounded-xl border p-4"
    :class="isDark ? 'border-orange-500/30 bg-orange-500/10' : 'border-orange-200 bg-orange-50'"
  >
    <h2
      class="text-sm font-semibold mb-2"
      :class="isDark ? 'text-orange-100' : 'text-orange-900'"
    >
      Digifi — Common mistakes to double-check
    </h2>
    <ul class="space-y-3 text-sm" :class="isDark ? 'text-orange-100/90' : 'text-orange-900/90'">
      <li v-for="item in DIGIFI_COMMON_MISTAKE_CHECKLIST" :key="item.id" class="list-none">
        <span class="font-semibold" :class="isDark ? 'text-orange-50' : 'text-orange-950'">
          {{ item.title }}
        </span>
        <span class="block mt-0.5 pl-0">{{ item.hint }}</span>
      </li>
    </ul>
  </div>
</template>
