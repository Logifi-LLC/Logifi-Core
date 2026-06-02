<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useDigifiCredits } from '~/composables/useDigifiCredits'

const props = defineProps<{
  isDarkMode: boolean
}>()

const dark = computed(() => props.isDarkMode)

const {
  transactions,
  transactionsLoading,
  fetchTransactions,
  formatTransactionLabel,
  formatTransactionAmount,
} = useDigifiCredits()

onMounted(() => {
  void fetchTransactions(20)
})

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
</script>

<template>
  <div
    class="mt-4 rounded-lg border p-3"
    :class="dark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'"
  >
    <h4
      class="text-sm font-semibold font-quicksand mb-2"
      :class="dark ? 'text-gray-100' : 'text-gray-800'"
    >
      Recent activity
    </h4>
    <p
      v-if="transactionsLoading"
      class="text-sm"
      :class="dark ? 'text-gray-400' : 'text-gray-500'"
    >
      Loading…
    </p>
    <p
      v-else-if="transactions.length === 0"
      class="text-sm"
      :class="dark ? 'text-gray-400' : 'text-gray-500'"
    >
      No credit activity yet.
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="tx in transactions"
        :key="tx.id"
        class="flex items-start justify-between gap-3 text-sm"
      >
        <div class="min-w-0">
          <p :class="dark ? 'text-gray-100' : 'text-gray-800'">
            {{ formatTransactionLabel(tx) }}
          </p>
          <p class="text-xs" :class="dark ? 'text-gray-500' : 'text-gray-500'">
            {{ formatWhen(tx.created_at) }}
          </p>
        </div>
        <span
          class="shrink-0 font-medium font-quicksand"
          :class="tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'"
        >
          {{ formatTransactionAmount(tx) }}
        </span>
      </li>
    </ul>
  </div>
</template>
