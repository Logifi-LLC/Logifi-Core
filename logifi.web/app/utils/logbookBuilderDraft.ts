import type {
  BuilderColumn,
  BuilderLayout,
  BuilderRow,
  BuilderTemplateColumn,
} from './logbookBuilderTypes'
import { ACCOUNT_SCOPED_STORAGE_KEYS, getScopedItem, removeScopedItem, setScopedItem } from './userScopedStorage'

export const BUILDER_DRAFT_STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.BUILDER_DRAFT
export const BUILDER_LAST_TEMPLATE_STORAGE_KEY = 'logifi-logbook-builder-last-template-id'

export function createBuilderSpreadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export interface LogbookBuilderDraft {
  version: 1
  savedAt: string
  spreadId: string
  columns: BuilderTemplateColumn[]
  layout: BuilderLayout
  rowCount: number
  twoPageSplitIndex: number
  tagsColumnWidth: number
  defaultImportRole: string
  defaultYear: number | null
  rows: BuilderRow[]
  leftPageScanned: boolean
  singleLayoutRightStartRow: number
}

export function draftHasContent(draft: LogbookBuilderDraft): boolean {
  for (const row of draft.rows) {
    if (row.tags?.length) return true
    for (const v of Object.values(row.cells ?? {})) {
      if ((v ?? '').trim()) return true
    }
  }
  return false
}

export function readDraftFromStorage(userId?: string): LogbookBuilderDraft | null {
  try {
    const raw = userId
      ? getScopedItem(BUILDER_DRAFT_STORAGE_KEY, userId)
      : localStorage.getItem(BUILDER_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LogbookBuilderDraft
    if (parsed?.version !== 1 || !Array.isArray(parsed.rows) || !Array.isArray(parsed.columns)) {
      return null
    }
    if (!parsed.spreadId || typeof parsed.spreadId !== 'string') {
      parsed.spreadId = createBuilderSpreadId()
    }
    return parsed
  } catch {
    return null
  }
}

export function writeDraftToStorage(draft: LogbookBuilderDraft, userId?: string): void {
  try {
    if (userId) {
      setScopedItem(BUILDER_DRAFT_STORAGE_KEY, userId, JSON.stringify(draft))
    } else {
      localStorage.setItem(BUILDER_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    }
  } catch (_) {}
}

export function clearDraftStorage(userId?: string): void {
  try {
    if (userId) {
      removeScopedItem(BUILDER_DRAFT_STORAGE_KEY, userId)
    } else {
      localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY)
    }
  } catch (_) {}
}

export function readLastTemplateId(): string | null {
  try {
    return localStorage.getItem(BUILDER_LAST_TEMPLATE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeLastTemplateId(id: string): void {
  try {
    localStorage.setItem(BUILDER_LAST_TEMPLATE_STORAGE_KEY, id)
  } catch (_) {}
}

export function clearLastTemplateId(): void {
  try {
    localStorage.removeItem(BUILDER_LAST_TEMPLATE_STORAGE_KEY)
  } catch (_) {}
}

export function columnsToTemplateColumns(columns: BuilderColumn[]): BuilderTemplateColumn[] {
  return columns.map((c) => ({
    id: c.id,
    fieldKey: c.fieldKey,
    label: c.label,
    order: c.order,
    width: c.width,
    categoryClassValue: c.categoryClassValue,
  }))
}
