import type { BuilderLayout, BuilderTemplateColumn } from './logbookBuilderTypes'

export interface ColumnLayoutInput {
  layout: BuilderLayout | string
  splitIndex: number | null | undefined
  columns: Array<{
    fieldKey: string | null
    label: string
    order: number
    categoryClassValue?: string | null
  }>
}

/** Column layout identity: order, field, label, category/class, and two-page split. */
export function columnLayoutSignature(input: ColumnLayoutInput): string {
  const layout = input.layout === 'two-page' ? 'two-page' : 'single'
  const columns = [...input.columns]
    .sort((a, b) => a.order - b.order)
    .map((column) => ({
      fieldKey: column.fieldKey,
      label: column.label.trim(),
      categoryClassValue: column.categoryClassValue ?? null,
    }))
  const splitIndex = layout === 'two-page' ? (input.splitIndex ?? null) : null
  return JSON.stringify({ layout, splitIndex, columns })
}

export function columnLayoutSignatureFromTemplate(template: {
  layout: string
  columns: BuilderTemplateColumn[]
  two_page_split_index?: number | null
}): string {
  return columnLayoutSignature({
    layout: template.layout,
    splitIndex: template.two_page_split_index,
    columns: template.columns.map((column) => ({
      fieldKey: column.fieldKey,
      label: column.label,
      order: column.order,
      categoryClassValue: column.categoryClassValue,
    })),
  })
}
