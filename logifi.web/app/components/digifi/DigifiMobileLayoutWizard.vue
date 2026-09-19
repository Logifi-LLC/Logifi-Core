<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import { persistLastTemplateId } from '~/composables/useLogbookBuilderLastTemplate'
import {
  DIGIFI_SCAN_FIELD_CHECKLIST,
  type BuilderTemplateColumn,
} from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import {
  layoutFromPageShape,
  pageShapeFromLayout,
  type DigifiPageShape,
} from '~/utils/digifiMobileReview'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('DigifiMobileLayoutWizard requires logbookBuilderGrid')

const { user, isAuthenticated } = useAuth()

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

function toggleField(fieldKey: LogbookColumnKey) {
  const existing = grid.columns.value.find((column) => column.fieldKey === fieldKey)
  if (existing) {
    if (grid.columns.value.length <= 1) return
    grid.removeColumn(existing.id)
    return
  }
  grid.addColumn(fieldKey)
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
  void loadTemplates()
})
</script>

<template>
  <div class="space-y-4">
    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Template</p>
      <div v-if="templates.length" class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="template in templates"
          :key="template.id"
          type="button"
          class="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100"
          @click="applyTemplate(template)"
        >
          {{ template.name }}
        </button>
      </div>
      <p v-else class="text-xs text-slate-500">No saved layouts.</p>
      <div class="flex gap-2">
        <input
          v-model="templateName"
          type="text"
          maxlength="40"
          placeholder="Save as"
          class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        >
        <button
          type="button"
          class="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
          :disabled="saving || !templateName.trim()"
          @click="saveTemplate"
        >
          Save
        </button>
      </div>
      <p v-if="templateError" class="text-xs text-rose-300">{{ templateError }}</p>
    </section>

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Page</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="option in ([
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'two-page', label: 'Two-page' },
          ] as const)"
          :key="option.value"
          type="button"
          class="rounded-xl border px-2 py-2 text-sm font-semibold"
          :class="
            pageShape === option.value
              ? 'border-orange-400/60 bg-orange-500/15 text-orange-100'
              : 'border-white/10 bg-white/5 text-slate-300'
          "
          @click="setShape(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section class="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p class="text-sm font-semibold text-slate-100">Flight lines</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-9 w-9 rounded-lg border border-white/15 text-lg font-semibold text-slate-100"
          :disabled="grid.rowCount.value <= 1"
          @click="bumpRows(-1)"
        >
          −
        </button>
        <span class="w-8 text-center font-mono text-sm tabular-nums text-slate-100">{{ grid.rowCount.value }}</span>
        <button
          type="button"
          class="h-9 w-9 rounded-lg border border-white/15 text-lg font-semibold text-slate-100"
          :disabled="grid.rowCount.value >= 100"
          @click="bumpRows(1)"
        >
          +
        </button>
      </div>
    </section>

    <section class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Columns</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in DIGIFI_SCAN_FIELD_CHECKLIST"
          :key="item.fieldKey"
          type="button"
          class="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          :class="
            selectedFieldKeys.has(item.fieldKey)
              ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
              : 'border-white/10 bg-white/5 text-slate-400'
          "
          @click="toggleField(item.fieldKey)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <button
      type="button"
      class="w-full rounded-xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      :disabled="scanning || selectedFieldKeys.size === 0"
      @click="emit('capture')"
    >
      {{ scanning ? 'Scanning…' : captureLabel }}
    </button>
  </div>
</template>
