<template>
  <section
    v-if="items.length > 0"
    class="mt-4 rounded-xl border px-4 py-3"
    :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'"
    aria-label="Currency summary"
  >
    <ul class="space-y-3">
      <li v-for="item in items" :key="item.id">
        <p
          :class="[
            'text-xs font-semibold uppercase tracking-wide font-quicksand',
            isDarkMode ? 'text-gray-400' : 'text-gray-500',
          ]"
        >
          {{ item.label }}
        </p>
        <p
          v-if="item.currentUntil"
          :class="['text-sm font-quicksand mt-0.5', isDarkMode ? 'text-gray-200' : 'text-gray-900']"
        >
          {{ item.currentUntil }}
        </p>
        <p
          v-if="item.needsLine"
          :class="[
            'text-sm font-quicksand mt-0.5',
            warnTextClass(item.status),
          ]"
        >
          {{ item.needsLine }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurrencyStatus, PassengerCurrencyGroup } from '~/utils/logbookTypes'
import { buildCurrencyDisplayItems } from '~/utils/currencyItemDisplay'
import type { CurrencyStatusType } from '~/utils/logbookTypes'

const props = defineProps<{
  passengerCurrency: CurrencyStatus | null
  nightCurrency: CurrencyStatus | null
  instrumentCurrency: CurrencyStatus | null
  flightReviewCurrency: CurrencyStatus | null
  passengerCurrencyGroups?: PassengerCurrencyGroup[]
  insufficientHistory?: boolean
  isDarkMode: boolean
}>()

const items = computed(() => {
  if (props.insufficientHistory) return []
  return buildCurrencyDisplayItems({
    passengerCurrency: props.passengerCurrency,
    nightCurrency: props.nightCurrency,
    instrumentCurrency: props.instrumentCurrency,
    flightReviewCurrency: props.flightReviewCurrency,
    passengerCurrencyGroups: props.passengerCurrencyGroups,
  })
})

function warnTextClass(status: CurrencyStatusType): string {
  if (status === 'expired' || status === 'missing') {
    return props.isDarkMode ? 'text-red-300' : 'text-red-800'
  }
  if (status === 'expiring_soon' || status === 'grace_period') {
    return props.isDarkMode ? 'text-amber-300' : 'text-amber-800'
  }
  return props.isDarkMode ? 'text-gray-300' : 'text-gray-700'
}
</script>