import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { supabase } from '~/lib/supabase'
import {
  clearLastTemplateId,
  readLastTemplateId,
  writeLastTemplateId,
} from '~/utils/logbookBuilderDraft'
import { columnLayoutSignature } from '~/utils/logbookBuilderTemplates'
import type { BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

export function persistLastTemplateId(templateId: string, userId?: string | null): void {
  writeLastTemplateId(templateId, userId)
}

export function noteGridTemplateApplied(grid: Grid, templateId: string): void {
  grid.noteTemplateApplied(
    templateId,
    columnLayoutSignature({
      layout: grid.layout.value,
      splitIndex: grid.effectiveSplitIndex.value,
      columns: grid.columns.value.map((column) => ({
        fieldKey: column.fieldKey,
        label: column.label,
        order: column.order,
        categoryClassValue: column.categoryClassValue,
        columnKind: column.columnKind,
      })),
    })
  )
}

export async function loadLastTemplateIfAny(
  grid: Grid,
  userId: string
): Promise<boolean> {
  const id = readLastTemplateId(userId)
  if (!id) return false

  const { data, error } = await (supabase as any)
    .from('logbook_builder_templates')
    .select('id, layout, default_row_count, columns, tags_column_width, default_import_role, two_page_split_index')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()

  // A failed request (session not ready, offline, RLS blip) must keep the saved id.
  // Clearing here was dropping the last-used template so the next visit started blank.
  if (error) return false
  if (!data) {
    clearLastTemplateId(userId, id)
    return false
  }

  grid.loadTemplate({
    columns: data.columns as BuilderTemplateColumn[],
    layout: data.layout as 'single' | 'two-page',
    default_row_count: data.default_row_count,
    tags_column_width: data.tags_column_width,
    default_import_role: data.default_import_role,
    two_page_split_index: data.two_page_split_index,
  })
  noteGridTemplateApplied(grid, id)
  persistLastTemplateId(id, userId)
  return true
}

function templateWriteFields(grid: Grid, name: string) {
  return {
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
      columnKind: column.columnKind,
    })),
  }
}

async function fetchOwnedTemplateName(
  userId: string,
  templateId: string
): Promise<{ name: string } | { missing: true } | { error: string }> {
  const { data, error } = await (supabase as any)
    .from('logbook_builder_templates')
    .select('id, name')
    .eq('user_id', userId)
    .eq('id', templateId)
    .maybeSingle()
  if (error) return { error: error.message ?? 'Could not save template.' }
  if (!data) return { missing: true }
  return { name: String(data.name ?? '') }
}

/** Name to show in the bottom Save Template field. Empty when nothing is loaded. */
export async function prefillBuilderTemplateName(grid: Grid, userId: string): Promise<string> {
  const id = grid.activeTemplateId.value
  if (!id) return ''
  const found = await fetchOwnedTemplateName(userId, id)
  return 'name' in found ? found.name : ''
}

function finishTemplateSave(grid: Grid, userId: string, id: string, updated: boolean) {
  persistLastTemplateId(id, userId)
  noteGridTemplateApplied(grid, id)
  grid.bumpTemplateCatalog()
  return { id, updated }
}

export async function saveLogbookBuilderTemplate(
  grid: Grid,
  userId: string,
  name: string
): Promise<{ id: string; updated: boolean } | { error: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Enter a template name.' }

  const fields = templateWriteFields(grid, trimmed)
  const activeId = grid.activeTemplateId.value
  if (activeId) {
    const found = await fetchOwnedTemplateName(userId, activeId)
    if ('error' in found) return found
    if ('name' in found && found.name.trim() === trimmed) {
      const { data, error } = await (supabase as any)
        .from('logbook_builder_templates')
        .update(fields)
        .eq('id', activeId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()
      if (error || !data?.id) {
        return { error: error?.message ?? 'Could not save template.' }
      }
      return finishTemplateSave(grid, userId, data.id, true)
    }
  }

  const { data, error } = await (supabase as any)
    .from('logbook_builder_templates')
    .insert({ user_id: userId, ...fields })
    .select('id')
    .maybeSingle()

  if (error || !data?.id) {
    return { error: error?.message ?? 'Could not save template.' }
  }

  return finishTemplateSave(grid, userId, data.id, false)
}
