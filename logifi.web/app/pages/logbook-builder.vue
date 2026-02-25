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
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
    <div class="mx-auto max-w-7xl space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Logbook Builder
        </h1>
        <NuxtLink
          to="/"
          class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Back to Logbook
        </NuxtLink>
      </div>
      <LogbookBuilderToolbar />
      <LogbookBuilderGrid ref="gridRef" />
      <LogbookBuilderValidateBar />
    </div>
  </div>
</template>
