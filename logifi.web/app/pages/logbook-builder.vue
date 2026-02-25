<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import LogbookBuilderGrid from '~/components/logbook-builder/LogbookBuilderGrid.vue'
import LogbookBuilderToolbar from '~/components/logbook-builder/LogbookBuilderToolbar.vue'
import LogbookBuilderValidateBar from '~/components/logbook-builder/LogbookBuilderValidateBar.vue'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useLogbookBuilderKeyboard } from '~/composables/useLogbookBuilderKeyboard'

definePageMeta({ layout: 'default' })

const gridRef = ref<InstanceType<typeof LogbookBuilderGrid> | null>(null)
const grid = useLogbookBuilderGrid()
provide('logbookBuilderGrid', grid)
const { visibleColumns, rows } = grid

useLogbookBuilderKeyboard({
  rowCount: computed(() => rows.value.length),
  columnCount: computed(() => visibleColumns.value.length),
  focusCell: (row, col) => gridRef.value?.focusCellByIndex(row, col),
  columnIdAt: (colIndex) => visibleColumns.value[colIndex]?.id ?? '',
})
</script>

<template>
  <div class="min-h-screen font-quicksand transition-colors duration-300 bg-gray-300 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-4">
      <div class="flex items-center justify-between pb-4 border-b border-gray-400/50 dark:border-gray-700/50">
        <h1 class="text-2xl font-bold font-quicksand text-gray-900 dark:text-white">
          Add Pages
        </h1>
        <NuxtLink
          to="/"
          :class="[
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-colors',
            'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
          ]"
        >
          Back to Logbook
        </NuxtLink>
      </div>
      <LogbookBuilderToolbar />
      <LogbookBuilderGrid ref="gridRef" />
      <LogbookBuilderValidateBar />
      <section
        class="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-600 dark:bg-gray-800 font-quicksand"
      >
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
          How to use
        </h2>
        <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
          <li>Use this grid to <strong>transcribe entries from a paper logbook</strong>. Fill in the cells, then validate and import into your digital logbook.</li>
          <li><strong>Toolbar:</strong> Set the number of rows; choose single-page or two-page layout (and “Columns on left” for two-page); add or remove columns; sign in to save or load templates.</li>
          <li><strong>Grid:</strong> Click a cell to edit; drag the right edge of a column header to resize; use the Tags column for each row. Use Tab or Enter to move between cells.</li>
          <li>Click <strong>Validate</strong> to check your data and see a summary with column totals. Then click <strong>Import</strong> on the confirmation step to add the entries to your logbook.</li>
        </ul>
      </section>
    </div>
  </div>
</template>
