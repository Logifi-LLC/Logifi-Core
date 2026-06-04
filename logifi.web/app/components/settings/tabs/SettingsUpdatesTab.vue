<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <SettingsSection
      title="Product updates"
      description="What's new in Logifi—past releases and improvements."
      :is-dark-mode="isDarkMode"
    >
      <div class="space-y-6">
        <article
          v-for="(update, index) in allUpdates"
          :key="update.id"
          class="rounded-xl border p-4 sm:p-5"
          :class="[
            isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white',
            index === 0 ? (isDarkMode ? 'ring-1 ring-blue-500/40 border-blue-500/30' : 'ring-2 ring-blue-200/80 border-blue-100') : '',
          ]"
        >
          <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
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
              class="text-base font-semibold font-quicksand min-w-0 flex-1"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'"
            >
              {{ update.title }}
            </h3>
            <time
              :datetime="update.date"
              class="text-xs font-medium shrink-0"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            >
              {{ formatProductUpdateDate(update.date) }}
            </time>
          </div>
          <p
            class="text-sm leading-relaxed mb-3"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            {{ update.summary }}
          </p>
          <ul
            class="space-y-1.5 text-sm list-disc pl-5"
            :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
          >
            <li v-for="(bullet, i) in update.bullets" :key="i">{{ bullet }}</li>
          </ul>
        </article>
      </div>
    </SettingsSection>
  </div>
</template>

<script setup lang="ts">
import SettingsSection from '~/components/settings/SettingsSection.vue'
import ProductUpdateHeadline from '~/components/ProductUpdateHeadline.vue'
import { formatProductUpdateDate } from '~/data/productUpdates'
import { useProductUpdates } from '~/composables/useProductUpdates'

defineProps<{
  isDarkMode: boolean
}>()

const { allUpdates } = useProductUpdates()
</script>
