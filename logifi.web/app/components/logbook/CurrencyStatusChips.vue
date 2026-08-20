<template>
  <div
    v-if="chips.length > 0"
    class="mt-4 flex flex-wrap gap-2"
    data-testid="currency-status-chips"
  >
    <button
      v-for="chip in chips"
      :key="chip.kind"
      type="button"
      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium font-quicksand transition-colors"
      :class="chipClass(chip.status)"
      :aria-label="`${chip.label}. Open currency details`"
      @click="$emit('open')"
    >
      {{ chip.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurrencyStatus, CurrencyStatusType } from '~/utils/logbookTypes'
import { formatCurrencyChip, type CurrencyChipKind } from '~/utils/currencyCalculator'

const props = defineProps<{
  passengerCurrency: CurrencyStatus | null
  nightCurrency: CurrencyStatus | null
  instrumentCurrency: CurrencyStatus | null
  isDarkMode: boolean
}>()

defineEmits<{
  open: []
}>()

const chips = computed(() => {
  const items: { kind: CurrencyChipKind; label: string; status: CurrencyStatusType }[] = []
  const kinds: { kind: CurrencyChipKind; currency: CurrencyStatus | null }[] = [
    { kind: 'passenger', currency: props.passengerCurrency },
    { kind: 'night', currency: props.nightCurrency },
    { kind: 'instrument', currency: props.instrumentCurrency },
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
      case 'expired':
        return 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
      default:
        return 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }
  }
  switch (status) {
    case 'current':
      return 'bg-green-100 text-green-700 hover:bg-green-200'
    case 'expiring_soon':
      return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
    case 'expired':
      return 'bg-red-100 text-red-700 hover:bg-red-200'
    default:
      return 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  }
}
</script>
