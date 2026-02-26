<script setup lang="ts">
import { inject, ref, computed, onMounted } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import type { BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'

const DEFAULT_ROLE_STORAGE_KEY = 'logifi-logbook-builder-default-role'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderToolbar must be used inside a page that provides logbookBuilderGrid')

const { user, isAuthenticated } = useAuth()
const { rowCount, setRowCount, addColumn, layout, columns, removeColumn, loadTemplate, visibleColumns, setTwoPageSplitIndex, twoPageSplitIndex, effectiveSplitIndex, tagsColumnWidth, defaultImportRole } = grid

const layoutOptions = [
  { value: 'single' as const, label: 'Single page' },
  { value: 'two-page' as const, label: 'Two-page' },
]

const defaultRoleOptions = [
  { value: 'PIC', label: 'PIC' },
  { value: 'SIC', label: 'SIC' },
  { value: 'Dual Received', label: 'Dual Received' },
  { value: 'Solo', label: 'Solo' },
  { value: 'Safety Pilot', label: 'Safety Pilot' },
  { value: 'Examiner', label: 'Examiner' },
  { value: 'Instructor', label: 'Instructor' },
]

onMounted(() => {
  try {
    const stored = localStorage.getItem(DEFAULT_ROLE_STORAGE_KEY)
    if (stored && defaultRoleOptions.some((o) => o.value === stored)) {
      defaultImportRole.value = stored
    }
  } catch (_) {}
})

function onDefaultRoleChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  defaultImportRole.value = value
  try {
    localStorage.setItem(DEFAULT_ROLE_STORAGE_KEY, value)
  } catch (_) {}
}

const showSaveModal = ref(false)
const showLoadModal = ref(false)
const templateName = ref('')
const savedTemplates = ref<{ id: string; name: string; layout: string; default_row_count: number; columns: BuilderTemplateColumn[]; tags_column_width?: number; default_import_role?: string; two_page_split_index?: number }[]>([])
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
    default_import_role: defaultImportRole.value || null,
    two_page_split_index: layout.value === 'two-page' ? grid.effectiveSplitIndex.value : null,
    columns: grid.visibleColumns.value.map((c) => ({
      id: c.id,
      fieldKey: c.fieldKey,
      label: c.label,
      order: c.order,
      width: c.width,
      categoryClassValue: c.categoryClassValue,
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
    .select('id, name, layout, default_row_count, columns, tags_column_width, default_import_role, two_page_split_index')
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
    default_import_role: t.default_import_role,
    two_page_split_index: t.two_page_split_index,
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
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Default role:</span>
      <select
        :value="defaultImportRole"
        class="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        @change="onDefaultRoleChange"
      >
        <option v-for="opt in defaultRoleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
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
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="showSaveModal = false"
    >
      <div
        class="relative w-full max-w-md rounded-xl border border-gray-300 bg-white shadow-2xl transition-colors dark:border-gray-700 dark:bg-gray-800"
        @click.stop
      >
        <div class="flex items-center justify-between flex-shrink-0 border-b border-gray-300 p-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold font-quicksand text-gray-900 dark:text-white">
            Save layout as template
          </h3>
          <button
            type="button"
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
            @click="showSaveModal = false"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium font-quicksand text-gray-700 dark:text-gray-300">Template name</label>
            <input
              v-model="templateName"
              type="text"
              placeholder="e.g. Jeppesen 10-row"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-quicksand text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              @keydown.enter="confirmSaveTemplate"
            />
          </div>
          <div class="flex justify-end gap-2 border-t border-gray-300 pt-4 dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium font-quicksand text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              @click="showSaveModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium font-quicksand text-white transition-colors hover:bg-blue-700"
              @click="confirmSaveTemplate"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Load template modal -->
  <Teleport to="body">
    <div
      v-if="showLoadModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="showLoadModal = false"
    >
      <div
        class="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border border-gray-300 bg-white shadow-2xl transition-colors dark:border-gray-700 dark:bg-gray-800"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between flex-shrink-0 border-b border-gray-300 p-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold font-quicksand text-gray-900 dark:text-white">
            Load template
          </h3>
          <button
            type="button"
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
            @click="showLoadModal = false"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
        </div>
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <p v-if="loadError" class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-quicksand text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {{ loadError }}
          </p>
          <ul v-else class="space-y-2">
            <li
              v-for="t in savedTemplates"
              :key="t.id"
              class="cursor-pointer rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-quicksand text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700"
              @click="selectTemplate(t)"
            >
              <span class="break-words">{{ t.name }}</span>
              <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ t.default_row_count }} rows, {{ t.layout }}</span>
            </li>
          </ul>
          <p v-if="savedTemplates.length === 0 && !loadError" class="py-6 text-center text-sm font-quicksand text-gray-500 dark:text-gray-400">
            No saved templates.
          </p>
        </div>
        <!-- Footer -->
        <div class="flex flex-shrink-0 justify-end border-t border-gray-300 p-4 dark:border-gray-700">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium font-quicksand text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="showLoadModal = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
