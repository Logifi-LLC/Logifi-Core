<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import type { BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderToolbar must be used inside a page that provides logbookBuilderGrid')

const { user, isAuthenticated } = useAuth()
const { rowCount, setRowCount, addColumn, layout, columns, removeColumn, loadTemplate, visibleColumns, setTwoPageSplitIndex, twoPageSplitIndex, effectiveSplitIndex, tagsColumnWidth } = grid

const layoutOptions = [
  { value: 'single' as const, label: 'Single page' },
  { value: 'two-page' as const, label: 'Two-page' },
]

const showSaveModal = ref(false)
const showLoadModal = ref(false)
const templateName = ref('')
const savedTemplates = ref<{ id: string; name: string; layout: string; default_row_count: number; columns: BuilderTemplateColumn[]; tags_column_width?: number }[]>([])
const loadError = ref<string | null>(null)

async function handleSaveTemplate() {
  if (!isAuthenticated.value || !user.value) {
    alert('Please sign in to save a template.')
    return
  }
  showSaveModal.value = true
  templateName.value = ''
}

async function confirmSaveTemplate() {
  const name = templateName.value.trim()
  if (!name || !user.value) return
  const payload = {
    user_id: user.value.id,
    name,
    layout: layout.value,
    default_row_count: rowCount.value,
    tags_column_width: tagsColumnWidth.value,
    columns: grid.visibleColumns.value.map((c) => ({
      id: c.id,
      fieldKey: c.fieldKey,
      label: c.label,
      order: c.order,
      width: c.width,
    })),
  }
  const { error } = await (supabase as any).from('logbook_builder_templates').insert(payload)
  if (error) {
    loadError.value = error.message
    return
  }
  showSaveModal.value = false
  templateName.value = ''
}

async function handleLoadTemplate() {
  if (!isAuthenticated.value || !user.value) {
    alert('Please sign in to load a template.')
    return
  }
  loadError.value = null
  const { data, error } = await (supabase as any)
    .from('logbook_builder_templates')
    .select('id, name, layout, default_row_count, columns, tags_column_width')
    .eq('user_id', user.value.id)
    .order('updated_at', { ascending: false })
  if (error) {
    loadError.value = error.message
    return
  }
  savedTemplates.value = data ?? []
  showLoadModal.value = true
}

function selectTemplate(t: (typeof savedTemplates.value)[0]) {
  loadTemplate({
    columns: t.columns,
    layout: t.layout as 'single' | 'two-page',
    default_row_count: t.default_row_count,
    tags_column_width: t.tags_column_width,
  })
  showLoadModal.value = false
}

function setLayout(value: string) {
  layout.value = value as 'single' | 'two-page'
  if (value === 'two-page' && visibleColumns.value.length > 1) {
    setTwoPageSplitIndex(Math.ceil(visibleColumns.value.length / 2))
  }
}

function onRowCountInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const n = parseInt(raw, 10)
  const clamped = Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 10
  setRowCount(clamped)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Rows:</span>
      <input
        type="number"
        :value="rowCount"
        min="1"
        max="100"
        class="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        @input="onRowCountInput($event)"
      />
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Layout:</span>
      <select
        :value="layout"
        class="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        @change="(e) => setLayout((e.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <div v-if="layout === 'two-page'" class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Columns on left:</span>
      <input
        type="number"
        :value="effectiveSplitIndex"
        :min="1"
        :max="Math.max(1, visibleColumns.length - 1)"
        class="w-14 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        @input="(e) => setTwoPageSplitIndex(parseInt((e.target as HTMLInputElement).value, 10) || 1)"
      />
    </div>
    <button
      type="button"
      class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      @click="addColumn(null)"
    >
      + Add column
    </button>
    <button
      v-if="columns.length > 1"
      type="button"
      class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      @click="removeColumn(columns[columns.length - 1]?.id)"
    >
      Remove column
    </button>
    <div class="ml-auto flex gap-2">
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="handleLoadTemplate"
      >
        Load template
      </button>
      <button
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        @click="handleSaveTemplate"
      >
        Save template
      </button>
    </div>
  </div>

  <!-- Save template modal -->
  <Teleport to="body">
    <div
      v-if="showSaveModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showSaveModal = false"
    >
      <div class="rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800">
        <h3 class="mb-2 text-sm font-semibold">Save layout as template</h3>
        <input
          v-model="templateName"
          type="text"
          placeholder="e.g. Jeppesen 10-row"
          class="mb-3 w-64 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          @keydown.enter="confirmSaveTemplate"
        />
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded border px-3 py-1.5 text-sm"
            @click="showSaveModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            @click="confirmSaveTemplate"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Load template modal -->
  <Teleport to="body">
    <div
      v-if="showLoadModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showLoadModal = false"
    >
      <div class="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800">
        <h3 class="mb-2 text-sm font-semibold">Load template</h3>
        <p v-if="loadError" class="mb-2 text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
        <ul class="space-y-1">
          <li
            v-for="t in savedTemplates"
            :key="t.id"
            class="cursor-pointer rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
            @click="selectTemplate(t)"
          >
            {{ t.name }} ({{ t.default_row_count }} rows, {{ t.layout }})
          </li>
        </ul>
        <p v-if="savedTemplates.length === 0 && !loadError" class="text-sm text-gray-500">No saved templates.</p>
        <button
          type="button"
          class="mt-3 rounded border px-3 py-1.5 text-sm"
          @click="showLoadModal = false"
        >
          Close
        </button>
      </div>
    </div>
  </Teleport>
</template>
