import type { LogbookColumnKey } from './logbookTypes'

/** Single column definition in the builder grid (user can map to a logbook field). */
export interface BuilderColumn {
  id: string
  fieldKey: LogbookColumnKey | null
  label: string
  order: number
  /** Width in pixels (optional; default applied in composable). */
  width?: number
  /** When fieldKey is 'categoryClass', specific category (ASEL, AMEL, etc.) so column title is that value. */
  categoryClassValue?: string
}

/** One row in the draft grid: cell values by column id plus optional tags. */
export interface BuilderRow {
  cells: Record<string, string>
  tags?: string[]
}

/** Layout mode for the builder (single page or two-page spread). */
export type BuilderLayout = 'single' | 'two-page'

/** Client-side shape for a saved template (matches DB columns JSONB + layout/row count). */
export interface BuilderTemplate {
  id: string
  name: string
  layout: BuilderLayout
  defaultRowCount: number
  columns: BuilderTemplateColumn[]
  createdAt?: string
  updatedAt?: string
}

/** Column as stored in a template (same as BuilderColumn but for serialization). */
export interface BuilderTemplateColumn {
  id: string
  fieldKey: LogbookColumnKey | null
  label: string
  order: number
  width?: number
  categoryClassValue?: string
}

/** Default number of rows when creating a new grid. */
export const DEFAULT_BUILDER_ROW_COUNT = 10

/** Default width for data columns (px). */
export const DEFAULT_COLUMN_WIDTH = 100
/** Default width for Tags column (px). */
export const DEFAULT_TAGS_COLUMN_WIDTH = 180

/** Category/Class options for the builder (match main logbook Add Entry). */
export const CATEGORY_CLASS_OPTIONS = [
  'ASEL', 'AMEL', 'ASES', 'AMES', 'HELI', 'GYRO', 'GLID', 'BAL', 'AIRS', 'PL', 'WSC-L', 'WSC-S',
] as const

/** Default columns for a new grid (Date, From, To, Route, PIC, Total + Tags column is fixed in UI). */
export const DEFAULT_BUILDER_COLUMNS: Omit<BuilderColumn, 'id'>[] = [
  { fieldKey: 'date', label: 'Date', order: 0, width: 100 },
  { fieldKey: 'departure', label: 'From', order: 1, width: 80 },
  { fieldKey: 'destination', label: 'To', order: 2, width: 80 },
  { fieldKey: 'route', label: 'Route', order: 3, width: 100 },
  { fieldKey: 'pic', label: 'PIC', order: 4, width: 70 },
  { fieldKey: 'total', label: 'Total', order: 5, width: 70 },
]

function generateId(): string {
  return crypto.randomUUID?.() ?? `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Create a new BuilderColumn with a stable id. */
export function createBuilderColumn(overrides: Partial<BuilderColumn> & { label: string; fieldKey: LogbookColumnKey | null; order: number }): BuilderColumn {
  return {
    id: overrides.id ?? generateId(),
    fieldKey: overrides.fieldKey ?? null,
    label: overrides.label,
    order: overrides.order,
    width: overrides.width,
    categoryClassValue: overrides.categoryClassValue,
  }
}

/** Create an empty row with cells for all column ids. */
export function createEmptyBuilderRow(columnIds: string[]): BuilderRow {
  const cells: Record<string, string> = {}
  for (const id of columnIds) {
    cells[id] = ''
  }
  return { cells, tags: [] }
}
