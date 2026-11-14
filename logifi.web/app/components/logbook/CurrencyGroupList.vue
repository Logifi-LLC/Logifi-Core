<template>
  <div class="space-y-1">
    <ul
      class="space-y-1"
      :aria-label="side === 'passenger' ? 'Day passenger currency by category and class' : 'Night passenger currency by category and class'"
    >
      <li
        v-for="group in categoryClassGroups"
        :key="`class-${group.key}`"
        class="rounded-lg border px-3 py-2"
        :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
      >
        <div class="flex items-center justify-between gap-1">
          <p :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            {{ group.label }}
          </p>
          <span
            :class="[
              'px-3 py-1 rounded-full text-xs font-semibold font-quicksand',
              getStatusBadgeColor(group[side].status)
            ]"
          >
            {{ getStatusText(group[side].status) }}
          </span>
        </div>
        <p :class="['mt-1 text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          {{ group[side].takeoffs || 0 }}/3 takeoffs
          <span aria-hidden="true"> · </span>
          {{ group[side].landings || 0 }}/3 landings
          <template v-if="group[side].isCurrent">
            <span aria-hidden="true"> · </span>
            until {{ formatDate(group[side].expirationDate) }}
          </template>
        </p>
      </li>
    </ul>
    <details
      v-if="typeGroups.length > 0"
      class="rounded-lg border px-3 py-1"
      :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
      :open="typeDetailsOpen"
    >
      <summary
        class="flex min-h-[44px] cursor-pointer items-center justify-between gap-1 text-xs font-semibold font-quicksand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
      >
        Types
      </summary>
      <ul
        class="space-y-1 pb-2"
        :aria-label="side === 'passenger' ? 'Day passenger currency by aircraft type' : 'Night passenger currency by aircraft type'"
      >
        <li
          v-for="group in typeGroups"
          :key="`type-${group.key}`"
          class="rounded-lg border px-3 py-2"
          :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
        >
          <div class="flex items-center justify-between gap-1">
            <p :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
              {{ group.label }}
            </p>
            <span
              :class="[
                'px-3 py-1 rounded-full text-xs font-semibold font-quicksand',
                getStatusBadgeColor(group[side].status)
              ]"
            >
              {{ getStatusText(group[side].status) }}
            </span>
          </div>
          <p :class="['mt-1 text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ group[side].takeoffs || 0 }}/3 takeoffs
            <span aria-hidden="true"> · </span>
            {{ group[side].landings || 0 }}/3 landings
            <template v-if="group[side].isCurrent">
              <span aria-hidden="true"> · </span>
              until {{ formatDate(group[side].expirationDate) }}
            </template>
          </p>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurrencyStatusType, PassengerCurrencyGroup } from '~/utils/logbookTypes'

const props = defineProps<{
  categoryClassGroups: PassengerCurrencyGroup[]
  typeGroups: PassengerCurrencyGroup[]
  side: 'passenger' | 'night'
  isDarkMode: boolean
  getStatusBadgeColor: (status: CurrencyStatusType | undefined) => string
  getStatusText: (status: CurrencyStatusType | undefined) => string
  formatDate: (date: Date) => string
}>()

const typeDetailsOpen = computed(() =>
  props.typeGroups.some((group) => !group[props.side].isCurrent)
)
</script>
