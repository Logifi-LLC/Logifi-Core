<script setup lang="ts">
import { inject } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderValidateBar must be used inside a page that provides logbookBuilderGrid')

const validating = ref(false)
const errorMessage = ref<string | null>(null)

async function handleValidateAndImport() {
  validating.value = true
  errorMessage.value = null
  try {
    const { runValidateAndImport } = await import('~/composables/useLogbookBuilderImport')
    const result = await runValidateAndImport(grid)
    if (result.errors.length > 0) {
      errorMessage.value = result.errors.slice(0, 5).map((e) => (e.rowIndex >= 0 ? `Row ${e.rowIndex}: ` : '') + e.message).join('; ')
    } else if (result.imported > 0) {
      await navigateTo('/')
    }
  } catch (e: any) {
    errorMessage.value = e?.message ?? 'Import failed'
  } finally {
    validating.value = false
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
    <button
      type="button"
      class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      :disabled="validating"
      @click="handleValidateAndImport"
    >
      {{ validating ? 'Validating…' : 'Validate & Import' }}
    </button>
    <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
      {{ errorMessage }}
    </p>
  </div>
</template>
