import { computed, inject, onMounted, ref, watch } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import { columnLayoutSignature, columnLayoutSignatureFromTemplate } from '~/utils/logbookBuilderTemplates'
import type { BuilderTemplateColumn } from '~/utils/logbookBuilderTypes'

export interface SavedBuilderTemplate {
  id: string
  name: string
  layout: string
  default_row_count: number
  columns: BuilderTemplateColumn[]
  tags_column_width?: number
  default_import_role?: string
  two_page_split_index?: number | null
}

export function useLogbookBuilderTemplateMatch() {
  const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
  if (!grid) {
    throw new Error('useLogbookBuilderTemplateMatch requires logbookBuilderGrid')
  }

  const { user, isAuthenticated } = useAuth()
  const templates = ref<SavedBuilderTemplate[]>([])
  const templatesLoaded = ref(false)

  const currentSignature = computed(() =>
    columnLayoutSignature({
      layout: grid.layout.value,
      splitIndex: grid.layout.value === 'two-page' ? grid.effectiveSplitIndex.value : null,
      columns: grid.visibleColumns.value.map((column) => ({
        fieldKey: column.fieldKey,
        label: column.label,
        order: column.order,
        categoryClassValue: column.categoryClassValue,
        columnKind: column.columnKind,
      })),
    })
  )

  const matchesSavedTemplate = computed(() =>
    templates.value.some(
      (template) => columnLayoutSignatureFromTemplate(template) === currentSignature.value
    )
  )

  const templateLoaded = computed(
    () =>
      grid.activeTemplateId.value != null &&
      grid.activeTemplateSignature.value === currentSignature.value
  )

  /** New or edited column layout — offer a save next to Validate. */
  const showSaveTemplate = computed(() => templatesLoaded.value && !matchesSavedTemplate.value)

  /** Nothing applied, or the applied template was edited. */
  const loadTemplateProminent = computed(() => !templateLoaded.value)

  async function refreshTemplates() {
    if (!isAuthenticated.value || !user.value) {
      templates.value = []
      templatesLoaded.value = true
      return
    }
    const { data, error } = await (supabase as any)
      .from('logbook_builder_templates')
      .select('id, name, layout, default_row_count, columns, tags_column_width, default_import_role, two_page_split_index')
      .eq('user_id', user.value.id)
      .order('updated_at', { ascending: false })
    if (error) {
      templatesLoaded.value = true
      return
    }
    templates.value = data ?? []
    templatesLoaded.value = true
  }

  onMounted(() => {
    void refreshTemplates()
  })

  watch(
    () => [isAuthenticated.value, user.value?.id, grid.templateCatalogVersion.value] as const,
    () => {
      void refreshTemplates()
    }
  )

  return {
    templates,
    templatesLoaded,
    currentSignature,
    matchesSavedTemplate,
    templateLoaded,
    showSaveTemplate,
    loadTemplateProminent,
    refreshTemplates,
  }
}
