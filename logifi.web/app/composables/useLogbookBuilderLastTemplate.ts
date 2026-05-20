import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { supabase } from '~/lib/supabase'
import {
  clearLastTemplateId,
  readLastTemplateId,
  writeLastTemplateId,
} from '~/utils/logbookBuilderDraft'
import type { BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

export function persistLastTemplateId(templateId: string): void {
  writeLastTemplateId(templateId)
}

export async function loadLastTemplateIfAny(
  grid: Grid,
  userId: string
): Promise<boolean> {
  const id = readLastTemplateId()
  if (!id) return false

  const { data, error } = await (supabase as any)
    .from('logbook_builder_templates')
    .select('id, layout, default_row_count, columns, tags_column_width, default_import_role, two_page_split_index')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    clearLastTemplateId()
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
  return true
}
