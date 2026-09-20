<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import { persistLastTemplateId } from '~/composables/useLogbookBuilderLastTemplate'
import { readLastTemplateId } from '~/utils/logbookBuilderDraft'
import {
  DIGIFI_SCAN_FIELD_CHECKLIST,
  ROLE_OPTIONS,
  type BuilderTemplateColumn,
} from '~/utils/logbookBuilderTypes'
import { ACCOUNT_SCOPED_STORAGE_KEYS, getScopedItem, setScopedItem } from '~/utils/userScopedStorage'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import {
  layoutFromPageShape,
  pageShapeFromLayout,
  type DigifiPageShape,
} from '~/utils/digifiMobileReview'
import { useTheme } from '~/composables/useTheme'
import { digifiMobileAccentIdle, digifiMobileAccentSelected } from '~/utils/digifiMobileTheme'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
const { isDark: isDarkMode } = useTheme()
if (!grid) throw new Error('DigifiMobileLayoutWizard requires logbookBuilderGrid')

const { user, isAuthenticated } = useAuth()

const DEFAULT_ROLE_STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.BUILDER_DEFAULT_ROLE

const defaultYearValue = computed({
  get: () => grid.defaultYear.value ?? new Date().getFullYear(),
  set: (v: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : new Date().getFullYear()
    grid.defaultYear.value = Math.min(2100, Math.max(1900, n))
  },
})

function onDefaultRoleChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  grid.defaultImportRole.value = value
  try {
    const userId = user.value?.id
    if (userId) {
      setScopedItem(DEFAULT_ROLE_STORAGE_KEY, userId, value)
    } else {
      localStorage.setItem(DEFAULT_ROLE_STORAGE_KEY, value)
    }
  } catch (_) {}
}

defineProps<{
  scanning: boolean
  pageShape: DigifiPageShape
  captureLabel: string
}>()

const emit = defineEmits<{
  'update:pageShape': [shape: DigifiPageShape]
  capture: []
}>()

const templates = ref<{ id: string; name: string; layout: string; default_row_count: number; columns: BuilderTemplateColumn[]; tags_column_width?: number; default_import_role?: string; two_page_split_index?: number }[]>([])
const templateName = ref('')
const templateError = ref<string | null>(null)
const saving = ref(false)
const columnsEditorExpanded = ref(true)
const addFieldKey = ref<LogbookColumnKey | ''>('')

const selectedFieldKeys = computed(() => {
  return new Set(
    grid.visibleColumns.value
      .map((column) => column.fieldKey)
      .filter((key): key is LogbookColumnKey => key != null)
  )
})

function setShape(shape: DigifiPageShape) {
  grid.layout.value = layoutFromPageShape(shape)
  if (shape === 'two-page' && grid.visibleColumns.value.length > 1) {
    grid.setTwoPageSplitIndex(Math.ceil(grid.visibleColumns.value.length / 2))
  }
  emit('update:pageShape', shape)
}

function bumpRows(delta: number) {
  const next = Math.min(100, Math.max(1, grid.rowCount.value + delta))
  grid.setRowCount(next)
}

const orderedColumns = computed(() => grid.visibleColumns.value)

const availableFieldsToAdd = computed(() =>
  DIGIFI_SCAN_FIELD_CHECKLIST.filter((item) => !selectedFieldKeys.value.has(item.fieldKey))
)

function addField(fieldKey: LogbookColumnKey) {
  grid.addColumn(fieldKey)
  addFieldKey.value = ''
  columnsEditorExpanded.value = true
}

function onAddFieldChange() {
  if (!addFieldKey.value) return
  addField(addFieldKey.value)
}

function removeField(columnId: string) {
  if (grid.columns.value.length <= 1) return
  grid.removeColumn(columnId)
}

function expandColumnEditor() {
  columnsEditorExpanded.value = true
}

const columnSummaryLabel = computed(() => {
  const n = orderedColumns.value.length
  return `${n} column${n === 1 ? '' : 's'} · Tap to edit`
})

function moveOrderedColumn(index: number, direction: 'up' | 'down') {
  const cols = orderedColumns.value
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= cols.length) return
  const ids = cols.map((column) => column.id)
  ;[ids[index], ids[swapWith]] = [ids[swapWith]!, ids[index]!]
  grid.reorderColumns(ids)
}

async function loadTemplates() {
  if (!isAuthenticated.value || !user.value) return
  templateError.value = null
  const { data, error } = await (supabase as any)
    .from('logbook_builder_templates')
    .select('id, name, layout, default_row_count, columns, tags_column_width, default_import_role, two_page_split_index')
    .eq('user_id', user.value.id)
    .order('updated_at', { ascending: false })
  if (error) {
    templateError.value = error.message
    return
  }
  templates.value = data ?? []
}

function applyTemplate(template: (typeof templates.value)[0]) {
  grid.loadTemplate({
    columns: template.columns,
    layout: template.layout as 'single' | 'two-page',
    default_row_count: template.default_row_count,
    tags_column_width: template.tags_column_width,
    default_import_role: template.default_import_role,
    two_page_split_index: template.two_page_split_index,
  })
  persistLastTemplateId(template.id)
  emit('update:pageShape', pageShapeFromLayout(template.layout as 'single' | 'two-page'))
  columnsEditorExpanded.value = true
}

async function saveTemplate() {
  const name = templateName.value.trim()
  if (!name || !user.value) return
  saving.value = true
  templateError.value = null
  const payload = {
    user_id: user.value.id,
    name,
    layout: grid.layout.value,
    default_row_count: grid.rowCount.value,
    tags_column_width: grid.tagsColumnWidth.value,
    default_import_role: grid.defaultImportRole.value || null,
    two_page_split_index: grid.layout.value === 'two-page' ? grid.effectiveSplitIndex.value : null,
    columns: grid.visibleColumns.value.map((column) => ({
      id: column.id,
      fieldKey: column.fieldKey,
      label: column.label,
      order: column.order,
      width: column.width,
      categoryClassValue: column.categoryClassValue,
    })),
  }
  const { error } = await (supabase as any).from('logbook_builder_templates').insert(payload)
  saving.value = false
  if (error) {
    templateError.value = error.message
    return
  }
  templateName.value = ''
  await loadTemplates()
}

onMounted(() => {
  try {
    const userId = user.value?.id
    const stored = userId
      ? getScopedItem(DEFAULT_ROLE_STORAGE_KEY, userId)
      : localStorage.getItem(DEFAULT_ROLE_STORAGE_KEY)
    if (stored && ROLE_OPTIONS.some((o) => o.value === stored)) {
      grid.defaultImportRole.value = stored
    }
  } catch (_) {}
  if (readLastTemplateId()) {
    columnsEditorExpanded.value = false
  }
  void loadTemplates()
})
</script>

<template>
  <div class="space-y-5">
    <section class="space-y-2">
      <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Template</p>
      <div v-if="templates.length" class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="template in templates"
          :key="template.id"
          type="button"
          class="shrink-0 rounded-full border px-4 py-2 text-xs font-semibold"
          :class="
            isDarkMode
              ? 'border-white/15 bg-white/5 text-gray-100'
              : 'border-gray-200 bg-white text-gray-900 shadow-sm'
          "
          @click="applyTemplate(template)"
        >
          {{ template.name }}
        </button>
      </div>
      <p v-else :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500']">No saved layouts.</p>
      <div class="flex gap-2">
        <input
          v-model="templateName"
          type="text"
          maxlength="40"
          placeholder="Save as"
          class="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
          :class="
            isDarkMode
              ? 'border-white/10 bg-white/5 text-gray-100 placeholder:text-gray-500'
              : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
          "
        >
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
          :class="
            isDarkMode
              ? 'border-white/15 text-gray-200'
              : 'border-gray-300 text-gray-800 hover:bg-gray-50'
          "
          :disabled="saving || !templateName.trim()"
          @click="saveTemplate"
        >
          Save
        </button>
      </div>
      <p v-if="templateError" :class="['text-xs', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ templateError }}</p>
    </section>

    <section class="space-y-2 opacity-90">
      <p :class="['text-[11px] font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Page</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="option in ([
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'two-page', label: 'Two-page' },
          ] as const)"
          :key="option.value"
          type="button"
          class="min-h-[48px] rounded-2xl border px-2 py-3 text-sm font-semibold"
          :class="
            pageShape === option.value
              ? digifiMobileAccentSelected(isDarkMode)
              : digifiMobileAccentIdle(isDarkMode)
          "
          @click="setShape(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section
      class="grid grid-cols-2 gap-3 rounded-2xl border px-4 py-3 opacity-90"
      :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'"
    >
      <label class="min-w-0 space-y-1">
        <span :class="['block text-[11px] font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Year</span>
        <input
          v-model.number="defaultYearValue"
          type="number"
          min="1900"
          max="2100"
          inputmode="numeric"
          class="w-full rounded-xl border px-3 py-2.5 text-sm font-mono tabular-nums"
          :class="
            isDarkMode
              ? 'border-white/10 bg-black/20 text-gray-100'
              : 'border-gray-200 bg-white text-gray-900 shadow-sm'
          "
        >
      </label>
      <label class="min-w-0 space-y-1">
        <span :class="['block text-[11px] font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-400']">Default role</span>
        <select
          :value="grid.defaultImportRole.value"
          class="w-full rounded-xl border px-3 py-2.5 text-sm font-semibold"
          :class="
            isDarkMode
              ? 'border-white/10 bg-black/20 text-gray-100'
              : 'border-gray-200 bg-white text-gray-900 shadow-sm'
          "
          @change="onDefaultRoleChange"
        >
          <option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
    </section>

    <section
      class="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 opacity-90"
      :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'"
    >
      <p :class="['text-sm font-medium', isDarkMode ? 'text-gray-200' : 'text-gray-700']">Flight lines</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-11 w-11 rounded-xl border text-lg font-semibold"
          :class="
            isDarkMode
              ? 'border-white/15 text-gray-100'
              : 'border-gray-300 text-gray-900 hover:bg-gray-50'
          "
          :disabled="grid.rowCount.value <= 1"
          @click="bumpRows(-1)"
        >
          −
        </button>
        <span :class="['w-8 text-center font-mono text-sm tabular-nums', isDarkMode ? 'text-gray-100' : 'text-gray-900']">{{ grid.rowCount.value }}</span>
        <button
          type="button"
          class="h-11 w-11 rounded-xl border text-lg font-semibold"
          :class="
            isDarkMode
              ? 'border-white/15 text-gray-100'
              : 'border-gray-300 text-gray-900 hover:bg-gray-50'
          "
          :disabled="grid.rowCount.value >= 100"
          @click="bumpRows(1)"
        >
          +
        </button>
      </div>
    </section>

    <section class="space-y-2">
      <p :class="['text-xs font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-400' : 'text-gray-500']">Columns</p>

      <button
        v-if="!columnsEditorExpanded && orderedColumns.length"
        type="button"
        class="flex w-full min-h-[48px] items-center justify-between rounded-2xl border px-4 py-3 text-left"
        :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'"
        aria-label="Edit columns"
        @click="expandColumnEditor"
      >
        <span :class="['text-sm font-semibold', isDarkMode ? 'text-green-200' : 'text-green-800']">
          {{ columnSummaryLabel }}
        </span>
        <span :class="['text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500']">›</span>
      </button>

      <template v-else>
        <ol v-if="orderedColumns.length" class="space-y-2">
          <li
            v-for="(column, index) in orderedColumns"
            :key="column.id"
            class="flex items-center gap-2 rounded-2xl border px-3 py-2"
            :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'"
          >
            <span
              :class="[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                isDarkMode ? 'bg-green-500/20 text-green-200' : 'bg-green-50 text-green-800',
              ]"
            >
              {{ index + 1 }}
            </span>
            <span :class="['min-w-0 flex-1 text-sm font-semibold', isDarkMode ? 'text-gray-100' : 'text-gray-900']">
              {{ column.label }}
            </span>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold disabled:opacity-30"
                :class="
                  isDarkMode
                    ? 'border-white/15 text-gray-100'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                "
                :disabled="index === 0"
                aria-label="Move column up"
                @click="moveOrderedColumn(index, 'up')"
              >
                ↑
              </button>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold disabled:opacity-30"
                :class="
                  isDarkMode
                    ? 'border-white/15 text-gray-100'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                "
                :disabled="index === orderedColumns.length - 1"
                aria-label="Move column down"
                @click="moveOrderedColumn(index, 'down')"
              >
                ↓
              </button>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold disabled:opacity-30"
                :class="
                  isDarkMode
                    ? 'border-white/15 text-rose-200'
                    : 'border-gray-300 text-rose-700 hover:bg-gray-50'
                "
                :disabled="grid.columns.value.length <= 1"
                aria-label="Remove column"
                @click="removeField(column.id)"
              >
                ×
              </button>
            </div>
          </li>
        </ol>

        <div v-if="availableFieldsToAdd.length" class="pt-1">
          <label class="sr-only" for="digifi-add-column-field">Add column field</label>
          <select
            id="digifi-add-column-field"
            v-model="addFieldKey"
            class="w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
            :class="
              isDarkMode
                ? 'border-white/10 bg-white/5 text-gray-100'
                : 'border-gray-200 bg-white text-gray-900 shadow-sm'
            "
            aria-label="Add column field"
            @change="onAddFieldChange"
          >
            <option value="">Add field…</option>
            <option v-for="item in availableFieldsToAdd" :key="item.fieldKey" :value="item.fieldKey">
              {{ item.label }}
            </option>
          </select>
        </div>
      </template>
    </section>

    <button
      type="button"
      class="w-full min-h-[52px] rounded-2xl bg-green-600 px-4 py-4 text-base font-semibold text-white shadow-sm disabled:opacity-50"
      :disabled="scanning || selectedFieldKeys.size === 0"
      @click="emit('capture')"
    >
      {{ scanning ? 'Scanning…' : captureLabel }}
    </button>
  </div>
</template>
