<script setup lang="ts">
import { inject, ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import type { ValidateOnlyResult, ColumnTotalRow } from '~/composables/useLogbookBuilderImport'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderValidateBar must be used inside a page that provides logbookBuilderGrid')

const validating = ref(false)
const errorMessage = ref<string | null>(null)
const showConfirm = ref(false)
const confirmResult = ref<{ validRowCount: number; columnTotals: ColumnTotalRow[] } | null>(null)
const importing = ref(false)

async function handleValidate() {
  validating.value = true
  errorMessage.value = null
  showConfirm.value = false
  confirmResult.value = null
  try {
    const { validateOnly } = await import('~/composables/useLogbookBuilderImport')
    const result: ValidateOnlyResult = await validateOnly(grid)
    if (!result.valid && result.errors.length > 0) {
      errorMessage.value = result.errors.slice(0, 5).map((e) => (e.rowIndex >= 0 ? `Row ${e.rowIndex}: ` : '') + e.message).join('; ')
    } else if (result.valid && result.validRowCount != null && result.columnTotals != null) {
      confirmResult.value = { validRowCount: result.validRowCount, columnTotals: result.columnTotals }
      showConfirm.value = true
    }
  } catch (e: any) {
    errorMessage.value = e?.message ?? 'Validation failed'
  } finally {
    validating.value = false
  }
}

function handleBack() {
  showConfirm.value = false
  confirmResult.value = null
}

async function handleImport() {
  if (!confirmResult.value) return
  importing.value = true
  errorMessage.value = null
  try {
    const { runValidateAndImport } = await import('~/composables/useLogbookBuilderImport')
    const result = await runValidateAndImport(grid)
    if (result.errors.length > 0) {
      errorMessage.value = result.errors.slice(0, 5).map((e) => (e.rowIndex >= 0 ? `Row ${e.rowIndex}: ` : '') + e.message).join('; ')
      showConfirm.value = false
      confirmResult.value = null
    } else if (result.imported > 0) {
      await navigateTo('/')
    }
  } catch (e: any) {
    errorMessage.value = e?.message ?? 'Import failed'
  } finally {
    importing.value = false
  }
}

function formatTotal(row: ColumnTotalRow): string {
  return row.isInteger ? String(row.total) : row.total.toFixed(1)
}
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
    <template v-if="!showConfirm">
      <div class="flex flex-wrap items-center gap-4">
        <button
          type="button"
          class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          :disabled="validating"
          @click="handleValidate"
        >
          {{ validating ? 'Validating…' : 'Validate' }}
        </button>
        <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
          {{ errorMessage }}
        </p>
      </div>
    </template>
    <template v-else>
      <div class="space-y-4">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ confirmResult?.validRowCount ?? 0 }} row(s) will be imported.
        </p>
        <div v-if="confirmResult?.columnTotals?.length" class="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Column totals</p>
          <ul class="space-y-1 text-sm text-gray-800 dark:text-gray-200">
            <li v-for="row in confirmResult.columnTotals" :key="row.fieldKey" class="flex justify-between gap-4">
              <span>{{ row.label }}</span>
              <span class="font-mono tabular-nums">{{ formatTotal(row) }}</span>
            </li>
          </ul>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            @click="handleBack"
          >
            Back
          </button>
          <button
            type="button"
            class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            :disabled="importing"
            @click="handleImport"
          >
            {{ importing ? 'Importing…' : 'Import' }}
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
          {{ errorMessage }}
        </p>
      </div>
    </template>
  </div>
</template>
