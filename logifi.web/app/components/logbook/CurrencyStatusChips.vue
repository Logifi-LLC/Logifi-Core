<template>
  <div
    v-if="showChips"
    class="mt-4 flex flex-wrap gap-2"
    data-testid="currency-status-chips"
  >
    <button
      v-if="insufficientHistory"
      type="button"
      class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium font-quicksand transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      :class="neutralChipClass"
      :aria-label="`${neutralLabel}. Open currency details`"
      @click="$emit('open')"
    >
      {{ neutralLabel }}
    </button>
    <template v-else>
      <button
        v-for="chip in chips"
        :key="chip.kind"
        type="button"
        class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium font-quicksand transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        :class="chipClass(chip.status)"
        :aria-label="`${chip.label}. Open currency details`"
        @click="$emit('open')"
      >
        {{ chip.label }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurrencyStatus, CurrencyStatusType } from '~/utils/logbookTypes'
import { formatCurrencyChip, type CurrencyChipKind } from '~/utils/currencyCalculator'
import { CURRENCY_TRACKING_NEUTRAL_LABEL } from '~/utils/currencyHistoryPolicy'

const props = defineProps<{
  passengerCurrency: CurrencyStatus | null
  nightCurrency: CurrencyStatus | null
  instrumentCurrency: CurrencyStatus | null
  flightReviewCurrency?: CurrencyStatus | null
  isDarkMode: boolean
  /** When true, show neutral tracking copy instead of expired/current chips. */
  insufficientHistory?: boolean
}>()

defineEmits<{
  open: []
}>()

const neutralLabel = CURRENCY_TRACKING_NEUTRAL_LABEL

const showChips = computed(() => props.insufficientHistory || chips.value.length > 0)

const neutralChipClass = computed(() =>
  props.isDarkMode
    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
)

const chips = computed(() => {
  const items: { kind: CurrencyChipKind; label: string; status: CurrencyStatusType }[] = []
  const kinds: { kind: CurrencyChipKind; currency: CurrencyStatus | null | undefined }[] = [
    { kind: 'passenger', currency: props.passengerCurrency },
    { kind: 'night', currency: props.nightCurrency },
    { kind: 'instrument', currency: props.instrumentCurrency },
    { kind: 'flight_review', currency: props.flightReviewCurrency },
  ]
  for (const { kind, currency } of kinds) {
    if (!currency) continue
    items.push({
      kind,
      label: formatCurrencyChip(kind, currency),
      status: currency.status,
    })
  }
  return items
})

function chipClass(status: CurrencyStatusType): string {
  if (props.isDarkMode) {
    switch (status) {
      case 'current':
        return 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
      case 'expiring_soon':
        return 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
      case 'grace_period':
        return 'bg-orange-900/30 text-orange-300 hover:bg-orange-900/50'
      case 'expired':
        return 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
      case 'missing':
        return 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      default:
        return 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }
  }
  switch (status) {
    case 'current':
      return 'bg-green-100 text-green-800 hover:bg-green-200'
    case 'expiring_soon':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    case 'grace_period':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
    case 'expired':
      return 'bg-red-100 text-red-800 hover:bg-red-200'
    case 'missing':
      return 'bg-gray-200 text-gray-800 hover:bg-gray-300'
    default:
      return 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  }
}
</script>
