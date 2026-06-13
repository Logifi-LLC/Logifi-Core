<template>
  <div class="space-y-4">
    <article
      v-for="(update, index) in allUpdates"
      :key="update.id"
      class="rounded-xl border p-4"
      :class="[
        isDarkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white',
        index === 0 ? (isDarkMode ? 'ring-1 ring-blue-500/40 border-blue-500/30' : 'ring-2 ring-blue-200/80 border-blue-100') : '',
      ]"
    >
      <div class="mb-2 flex flex-wrap items-start justify-between gap-3">
        <ProductUpdateHeadline
          v-if="update.tagline"
          :title="update.title"
          :tagline="update.tagline"
          :is-dark-mode="isDarkMode"
          :compact="index !== 0"
          heading-tag="h3"
          class="min-w-0 flex-1"
        />
        <h3
          v-else
          class="min-w-0 flex-1 text-base font-semibold font-quicksand"
          :class="isDarkMode ? 'text-white' : 'text-gray-900'"
        >
          {{ update.title }}
        </h3>
        <time
          :datetime="update.date"
          class="shrink-0 text-xs font-medium"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        >
          {{ formatProductUpdateDate(update.date) }}
        </time>
      </div>
      <p class="mb-3 text-sm leading-relaxed" :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
        {{ update.summary }}
      </p>
      <ul class="list-disc space-y-1.5 pl-5 text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
        <li v-for="(bullet, i) in update.bullets" :key="i">{{ bullet }}</li>
      </ul>
    </article>
  </div>
</template>

<script setup lang="ts">
import ProductUpdateHeadline from '~/components/ProductUpdateHeadline.vue'
import { formatProductUpdateDate } from '~/data/productUpdates'
import { useProductUpdates } from '~/composables/useProductUpdates'

defineProps<{
  isDarkMode: boolean
}>()

const { allUpdates } = useProductUpdates()
</script>
