<script setup lang="ts">
import { inject, ref, computed, onMounted } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import type { BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'
import { ROLE_OPTIONS } from '~/utils/logbookBuilderTypes'
import { useTheme } from '~/composables/useTheme'

const DEFAULT_ROLE_STORAGE_KEY = 'logifi-logbook-builder-default-role'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderToolbar must be used inside a page that provides logbookBuilderGrid')

const { user, isAuthenticated } = useAuth()
const { rowCount, setRowCount, addColumn, layout, columns, removeColumn, loadTemplate, deleteTemplate, visibleColumns, setTwoPageSplitIndex, twoPageSplitIndex, effectiveSplitIndex, tagsColumnWidth, defaultImportRole, defaultYear } = grid

const { isDark } = useTheme()

const layoutOptions = [
  { value: 'single' as const, label: 'Single page' },
  { value: 'two-page' as const, label: 'Two-page' },
]

onMounted(() => {
  try {
    const stored = localStorage.getItem(DEFAULT_ROLE_STORAGE_KEY)
    if (stored && ROLE_OPTIONS.some((o) => o.value === stored)) {
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

const defaultYearValue = computed({
  get: () => defaultYear.value ?? new Date().getFullYear(),
  set: (v: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : new Date().getFullYear()
    defaultYear.value = Math.min(2100, Math.max(1900, n))
  },
})

const showSaveModal = ref(false)
const showLoadModal = ref(false)
const templateName = ref('')
const savedTemplates = ref<{ id: string; name: string; layout: string; default_row_count: number; columns: BuilderTemplateColumn[]; tags_column_width?: number; default_import_role?: string; two_page_split_index?: number }[]>([])
const loadError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const templateToDelete = ref<{ id: string; name: string } | null>(null)
const deletingTemplateId = ref<string | null>(null)

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
    two_page_split_index: layout.value === 'two-page' ? grid!.effectiveSplitIndex.value : null,
    columns: grid!.visibleColumns.value.map((c) => ({
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
  deleteError.value = null
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

function requestDeleteTemplate(t: (typeof savedTemplates.value)[0]) {
  deleteError.value = null
  templateToDelete.value = { id: t.id, name: t.name }
}

function clearDeleteConfirm() {
  templateToDelete.value = null
  deleteError.value = null
  deletingTemplateId.value = null
}

async function confirmDeleteTemplate() {
  if (!templateToDelete.value || !isAuthenticated.value) return
  const id = templateToDelete.value.id
  deletingTemplateId.value = id
  deleteError.value = null
  const result = await deleteTemplate(id)
  deletingTemplateId.value = null
  if (result.ok) {
    savedTemplates.value = savedTemplates.value.filter((t) => t.id !== id)
    templateToDelete.value = null
  } else {
    deleteError.value = result.error ?? 'Failed to delete template'
    templateToDelete.value = null
  }
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
  <div
    class="flex flex-wrap items-center gap-4 rounded-lg border p-3"
    :class="isDark ? 'border-white/10 bg-gray-900 shadow-md shadow-black/40' : 'border-gray-200 bg-white'"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium transition-colors" :class="isDark ? 'text-gray-300' : 'text-gray-900'">Rows:</span>
      <input
        type="number"
        :value="rowCount"
        min="1"
        max="100"
        :class="[
          'w-16 rounded border px-2 py-1 text-sm shadow-sm transition-colors',
          isDark
            ? 'border-white/10 bg-black/20 text-white shadow-inner'
            : 'border-gray-300 bg-white text-gray-900'
        ]"
        @input="onRowCountInput($event)"
      />
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium transition-colors" :class="isDark ? 'text-gray-300' : 'text-gray-900'">Layout:</span>
      <select
        :value="layout"
        :class="[
          'rounded border px-2 py-1 text-sm shadow-sm transition-colors',
          isDark
            ? 'border-white/10 bg-black/20 text-white shadow-inner'
            : 'border-gray-300 bg-white text-gray-900'
        ]"
        @change="(e) => setLayout((e.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium transition-colors" :class="isDark ? 'text-gray-300' : 'text-gray-900'">Year:</span>
      <input
        v-model.number="defaultYearValue"
        type="number"
        min="1900"
        max="2100"
        :class="[
          'w-20 rounded border px-2 py-1 text-sm shadow-sm transition-colors',
          isDark
            ? 'border-white/10 bg-black/20 text-white shadow-inner'
            : 'border-gray-300 bg-white text-gray-900'
        ]"
      />
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium transition-colors" :class="isDark ? 'text-gray-300' : 'text-gray-900'">Default role:</span>
      <select
        :value="defaultImportRole"
        :class="[
          'rounded border px-2 py-1 text-sm shadow-sm transition-colors',
          isDark
            ? 'border-white/10 bg-black/20 text-white shadow-inner'
            : 'border-gray-300 bg-white text-gray-900'
        ]"
        @change="onDefaultRoleChange"
      >
        <option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <div v-if="layout === 'two-page'" class="flex items-center gap-2">
      <span class="text-sm font-medium transition-colors" :class="isDark ? 'text-gray-300' : 'text-gray-900'">Columns on left:</span>
      <input
        type="number"
        :value="effectiveSplitIndex"
        :min="1"
        :max="Math.max(1, visibleColumns.length - 1)"
        :class="[
          'w-14 rounded border px-2 py-1 text-sm shadow-sm transition-colors',
          isDark
            ? 'border-white/10 bg-black/20 text-white shadow-inner'
            : 'border-gray-300 bg-white text-gray-900'
        ]"
        @input="(e) => setTwoPageSplitIndex(parseInt((e.target as HTMLInputElement).value, 10) || 1)"
      />
    </div>
    <button
      type="button"
      :class="[
        'rounded px-3 py-1.5 text-sm font-medium transition-colors border',
        isDark
          ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600'
          : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-300 shadow-sm'
      ]"
      @click="addColumn(null)"
    >
      + Add column
    </button>
    <button
      v-if="columns.length > 1"
      type="button"
      :class="[
        'rounded border px-3 py-1.5 text-sm transition-colors',
        isDark 
          ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 shadow-sm shadow-black/20' 
          : 'border-gray-300 bg-gray-200 text-black hover:bg-gray-300 shadow-sm'
      ]"
      @click="removeColumn(columns[columns.length - 1]!.id)"
    >
      Remove column
    </button>
    <div class="ml-auto flex gap-2">
      <button
        type="button"
        :class="[
          'rounded border px-3 py-1.5 text-sm transition-colors',
          isDark 
            ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 shadow-sm shadow-black/20' 
            : 'border-gray-300 bg-gray-200 text-black hover:bg-gray-300 shadow-sm'
        ]"
        @click="handleLoadTemplate"
      >
        Load template
      </button>
      <button
        type="button"
        :class="[
          'rounded border px-3 py-1.5 text-sm transition-colors',
          isDark 
            ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 shadow-sm shadow-black/20' 
            : 'border-gray-300 bg-gray-200 text-black hover:bg-gray-300 shadow-sm'
        ]"
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
        class="relative w-full max-w-md rounded-xl border border-gray-300 bg-white shadow-2xl transition-colors dark:border-white/10 dark:bg-gray-900 dark:shadow-xl dark:shadow-black/50"
        @click.stop
      >
        <div class="flex items-center justify-between flex-shrink-0 border-b border-gray-300 p-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold font-quicksand text-gray-900 dark:text-white">
            Save layout as template
          </h3>
          <button
            type="button"
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
            @click="showSaveModal = false"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
        </div>
        <div class="p-4 space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium font-quicksand transition-colors" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Template name</label>
            <input
              v-model="templateName"
              type="text"
              placeholder="e.g. Jeppesen 10-row"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-quicksand text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder-gray-400 dark:shadow-inner"
              @keydown.enter="confirmSaveTemplate"
            />
          </div>
          <div class="flex justify-end gap-2 border-t border-gray-300 pt-4 dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium font-quicksand text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:shadow-sm dark:shadow-black/20"
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
        class="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border border-gray-300 bg-white shadow-2xl transition-colors dark:border-white/10 dark:bg-gray-900 dark:shadow-xl dark:shadow-black/50"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between flex-shrink-0 border-b border-gray-300 p-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold font-quicksand text-gray-900 dark:text-white">
            Load template
          </h3>
          <button
            type="button"
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-white/10 transition-colors"
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
          <p v-if="deleteError" class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-quicksand text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {{ deleteError }}
          </p>
          <ul class="space-y-2">
            <li
              v-for="t in savedTemplates"
              :key="t.id"
              class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-quicksand text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:bg-white/10"
            >
              <button
                type="button"
                class="min-w-0 flex-1 cursor-pointer text-left"
                @click="selectTemplate(t)"
              >
                <span class="break-words">{{ t.name }}</span>
                <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ t.default_row_count }} rows, {{ t.layout }}</span>
              </button>
              <button
                type="button"
                class="flex-shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
                :disabled="deletingTemplateId !== null"
                aria-label="Delete template"
                @click.stop="requestDeleteTemplate(t)"
              >
                <Icon name="ri:delete-bin-line" size="18" />
              </button>
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
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium font-quicksand text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:shadow-sm dark:shadow-black/20"
            @click="showLoadModal = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Delete template confirmation -->
  <Teleport to="body">
    <div
      v-if="templateToDelete"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      @click.self="clearDeleteConfirm"
    >
      <div
        class="relative w-full max-w-md rounded-xl border border-gray-300 bg-white shadow-2xl transition-colors dark:border-white/10 dark:bg-gray-900 dark:shadow-xl dark:shadow-black/50"
        @click.stop
      >
        <div class="flex items-center justify-between flex-shrink-0 border-b border-gray-300 p-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold font-quicksand text-gray-900 dark:text-white">
            Delete template?
          </h3>
          <button
            type="button"
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-white/10 transition-colors"
            aria-label="Cancel"
            :disabled="deletingTemplateId !== null"
            @click="clearDeleteConfirm"
          >
            <Icon name="ri:close-line" size="22" />
          </button>
        </div>
        <div class="p-4 space-y-4">
          <p class="text-sm font-quicksand text-gray-700 dark:text-gray-300">
            Delete the page layout template &quot;{{ templateToDelete.name }}&quot;? This does not delete any logbook entries.
          </p>
          <div class="flex justify-end gap-2 border-t border-gray-300 pt-4 dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium font-quicksand text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:shadow-sm dark:shadow-black/20 disabled:opacity-50"
              :disabled="deletingTemplateId !== null"
              @click="clearDeleteConfirm"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium font-quicksand text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              :disabled="deletingTemplateId !== null"
              @click="confirmDeleteTemplate"
            >
              {{ deletingTemplateId ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
