<script setup lang="ts">
import { computed } from 'vue'
import type { ImportProviderKey } from '../../../shared/import'
import { PROVIDER_GUIDES } from '../../../shared/import'

const props = defineProps<{
  provider: ImportProviderKey
  isDarkMode: boolean
}>()

const guide = computed(() => PROVIDER_GUIDES[props.provider])
</script>

<template>
  <aside
    class="rounded-xl border p-4 font-quicksand"
    :class="
      isDarkMode
        ? 'border-gray-700 bg-gray-900/50 text-gray-300'
        : 'border-gray-200 bg-slate-50 text-gray-700'
    "
    aria-label="Export instructions"
  >
    <div class="flex items-start gap-2 mb-3">
      <span class="text-xl leading-none" aria-hidden="true">{{ guide.emoji }}</span>
      <div>
        <h3
          class="text-sm font-semibold"
          :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
        >
          {{ guide.label }} export guide
        </h3>
        <p class="mt-0.5 text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
          {{ guide.description }}
        </p>
      </div>
    </div>
    <ol class="list-decimal pl-5 space-y-2 text-sm leading-snug">
      <li v-for="(step, index) in guide.steps" :key="index">
        {{ step }}
      </li>
    </ol>
  </aside>
</template>
