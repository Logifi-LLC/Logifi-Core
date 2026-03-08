<script setup lang="ts">
import { ref, computed, provide, watchEffect } from 'vue'
import LogbookBuilderGrid from '~/components/logbook-builder/LogbookBuilderGrid.vue'
import LogbookBuilderToolbar from '~/components/logbook-builder/LogbookBuilderToolbar.vue'
import LogbookBuilderValidateBar from '~/components/logbook-builder/LogbookBuilderValidateBar.vue'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useLogbookBuilderKeyboard } from '~/composables/useLogbookBuilderKeyboard'
import { useTheme } from '~/composables/useTheme'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'

definePageMeta({ layout: 'default' })

const gridRef = ref<InstanceType<typeof LogbookBuilderGrid> | null>(null)
const grid = useLogbookBuilderGrid()
provide('logbookBuilderGrid', grid)
const { visibleColumns, rows } = grid

const builderPilots = ref<string[]>([])
provide('builderPilots', builderPilots)

const { user, isAuthenticated } = useAuth()

watchEffect(async (onCleanup) => {
  const currentUser = user.value

  if (!isAuthenticated.value || !currentUser) {
    builderPilots.value = []
    return
  }

  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })

  try {
    const { data, error } = await (supabase as any)
      .from('log_entries')
      .select('training_elements')
      .eq('user_id', currentUser.id)

    if (error) {
      console.error('Error loading builder pilots:', error)
      return
    }

    if (!data || cancelled) return

    const names = (data as { training_elements: string | null }[])
      .map((row) => (row.training_elements || '').trim())
      .filter((name) => !!name)

    builderPilots.value = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.error('Exception loading builder pilots:', err)
  }
})

const { theme, isDark } = useTheme()

useLogbookBuilderKeyboard({
  rowCount: computed(() => rows.value.length),
  columnCount: computed(() => visibleColumns.value.length),
  focusCell: (row, col) => gridRef.value?.focusCellByIndex(row, col),
  columnIdAt: (colIndex) => visibleColumns.value[colIndex]?.id ?? '',
})
</script>

<template>
  <div
    class="min-h-screen font-quicksand transition-colors duration-300 p-4 sm:p-6 lg:p-8"
    :class="theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'"
  >
    <div class="mx-auto max-w-7xl space-y-4">
      <div
        class="flex items-center justify-between pb-4 border-b"
        :class="theme === 'dark' ? 'border-white/10' : 'border-gray-400/50'"
      >
        <h1
          class="text-2xl font-bold font-quicksand"
          :class="theme === 'dark' ? 'text-white' : 'text-gray-900'"
        >
          Add Pages
        </h1>
        <NuxtLink
          to="/"
          :class="[
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-quicksand font-medium transition-colors border',
            theme === 'dark'
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white shadow-sm shadow-black/20'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-300'
          ]"
        >
          Back to Logbook
        </NuxtLink>
      </div>
      <LogbookBuilderToolbar />
      <LogbookBuilderGrid ref="gridRef" />
      <LogbookBuilderValidateBar />
      <section
        class="rounded-lg p-4 sm:p-6 font-quicksand border"
        :class="theme === 'dark'
          ? 'border-white/10 bg-gray-900 shadow-md shadow-black/40'
          : 'border-gray-200 bg-white'"
      >
        <h2
          class="text-base font-semibold mb-3"
          :class="theme === 'dark' ? 'text-white' : 'text-gray-900'"
        >
          How to use
        </h2>
        <ul
          class="space-y-2 text-sm list-disc list-inside"
          :class="theme === 'dark' ? 'text-gray-300' : 'text-gray-700'"
        >
          <li>Use this grid to <strong>transcribe entries from a paper logbook</strong>. Fill in the cells, then validate and import into your digital logbook.</li>
          <li><strong>Toolbar:</strong> Set the number of rows; choose single-page or two-page layout (and “Columns on left” for two-page); add or remove columns; sign in to save or load templates.</li>
          <li><strong>Grid:</strong> Click a cell to edit; drag a column header to reorder columns; drag the right edge of a column header to resize; use the Tags column for each row. Use Tab or Enter to move between cells.</li>
          <li><strong>Approaches:</strong> Use the <strong>Approach</strong> column for counts, and the <strong>Approach Type</strong> dropdown (ILS, RNAV, Visual, etc.) when you want the type tracked. If the type is only written in remarks, you can leave the dropdown blank and the system will still count the approaches.</li>
          <li>Click <strong>Validate</strong> to check your data and see a summary with column totals. Then click <strong>Import</strong> on the confirmation step to add the entries to your logbook.</li>
        </ul>
      </section>
    </div>
  </div>
</template>
