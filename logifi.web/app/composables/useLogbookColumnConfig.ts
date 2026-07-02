import {
  DEFAULT_COLUMN_CONFIG,
  type LogbookColumnConfig,
  type LogbookColumnKey,
} from '~/utils/logbookTypes'
import {
  ENTRY_CARD_PRESETS,
  isDetailChipKey,
  isFooterZoneKey,
  isHeaderZoneKey,
  type EntryCardPresetId,
} from '~/utils/entryCardPresets'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
  migrateGlobalToScoped,
  setScopedItem,
} from '~/utils/userScopedStorage'

const COLUMN_CONFIG_STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.COLUMN_CONFIG
const PRESET_STORAGE_KEY = ACCOUNT_SCOPED_STORAGE_KEYS.ENTRY_CARD_PRESET
const LEGACY_PRESET_STORAGE_KEY = 'logifi-entry-card-preset'

const isBrowser = typeof window !== 'undefined'

const columnConfig = ref<LogbookColumnConfig[]>(DEFAULT_COLUMN_CONFIG.map((c) => ({ ...c })))
const activePresetId = ref<EntryCardPresetId>('custom')
const draggedColumnKey = ref<LogbookColumnKey | null>(null)
const resizingColumn = ref<LogbookColumnKey | null>(null)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)

function getStorageUserId(): string | undefined {
  const { user } = useAuth()
  return user.value?.id
}

function readScopedLocal(baseKey: string, allowGlobalFallback = false): string | null {
  const userId = getStorageUserId()
  if (userId) {
    const scoped = getScopedItem(baseKey, userId)
    if (scoped != null) return scoped
  }
  if (allowGlobalFallback && isBrowser) {
    return window.localStorage.getItem(baseKey)
  }
  return null
}

function writeScopedLocal(baseKey: string, value: string): void {
  const userId = getStorageUserId()
  if (userId) {
    setScopedItem(baseKey, userId, value)
    return
  }
  if (isBrowser) {
    window.localStorage.setItem(baseKey, value)
  }
}

function migrateLegacyStorage(): void {
  const userId = getStorageUserId()
  if (!userId || !isBrowser) return

  migrateGlobalToScoped(COLUMN_CONFIG_STORAGE_KEY, userId, false)

  const scopedPreset = getScopedItem(PRESET_STORAGE_KEY, userId)
  if (scopedPreset == null) {
    const legacyPreset = window.localStorage.getItem(LEGACY_PRESET_STORAGE_KEY)
    if (legacyPreset != null) {
      setScopedItem(PRESET_STORAGE_KEY, userId, legacyPreset)
    }
  }
}

function saveColumnConfig(): void {
  if (!isBrowser) return
  writeScopedLocal(COLUMN_CONFIG_STORAGE_KEY, JSON.stringify(columnConfig.value))
}

function savePresetId(): void {
  if (!isBrowser) return
  writeScopedLocal(PRESET_STORAGE_KEY, activePresetId.value)
}

function mergeSavedColumns(parsed: LogbookColumnConfig[]): LogbookColumnConfig[] {
  const merged = DEFAULT_COLUMN_CONFIG.map((defaultCol) => {
    const savedCol = parsed.find((p) => p.key === defaultCol.key)
    if (savedCol) {
      return {
        ...savedCol,
        required: defaultCol.required,
        label: defaultCol.label,
        responsiveClass: defaultCol.responsiveClass,
        width: savedCol.width ?? defaultCol.width,
        visible: defaultCol.required ? true : savedCol.visible,
      }
    }
    return { ...defaultCol }
  })
  merged.forEach((col) => {
    if (col.required) col.visible = true
  })
  return merged
}

function loadColumnConfig(): void {
  if (!isBrowser) return

  migrateLegacyStorage()

  const saved = readScopedLocal(COLUMN_CONFIG_STORAGE_KEY, true)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as LogbookColumnConfig[]
      if (Array.isArray(parsed)) {
        columnConfig.value = mergeSavedColumns(parsed)
        saveColumnConfig()
        loadPresetId()
        return
      }
    } catch {
      // use defaults
    }
  }
  columnConfig.value = DEFAULT_COLUMN_CONFIG.map((c) => ({ ...c }))
  loadPresetId()
}

function loadPresetId(): void {
  if (!isBrowser) return
  const saved = readScopedLocal(PRESET_STORAGE_KEY, true) as EntryCardPresetId | null
  if (saved && (saved === 'custom' || ENTRY_CARD_PRESETS.some((p) => p.id === saved))) {
    activePresetId.value = saved
  }
}

const visibleColumns = computed(() =>
  columnConfig.value.filter((col) => col.visible).sort((a, b) => a.order - b.order),
)

const displayColumnConfig = computed(() => [...columnConfig.value])

const visibleDetailFields = computed(() =>
  visibleColumns.value.filter((col) => isDetailChipKey(col.key)),
)

const showRemarksFooter = computed(() =>
  columnConfig.value.some((col) => col.key === 'remarks' && col.visible),
)

const detailFieldCount = computed(() => visibleDetailFields.value.length)

const detailFieldCrowded = computed(() => detailFieldCount.value > 8)

const pickerFields = computed(() =>
  [...columnConfig.value].sort((a, b) => a.order - b.order),
)

function markCustom(): void {
  activePresetId.value = 'custom'
  savePresetId()
}

function toggleColumnVisibility(key: LogbookColumnKey): void {
  const col = columnConfig.value.find((c) => c.key === key)
  if (!col || col.required) return

  const visibleNonRequired = columnConfig.value.filter((c) => c.visible && !c.required)
  if (visibleNonRequired.length === 1 && col.visible) return

  col.visible = !col.visible
  saveColumnConfig()
  markCustom()
}

function reorderColumns(draggedKey: LogbookColumnKey, targetOrder: number): void {
  const draggedCol = columnConfig.value.find((c) => c.key === draggedKey)
  if (!draggedCol) return

  const currentOrder = draggedCol.order

  columnConfig.value.forEach((col) => {
    if (col.key === draggedKey) {
      col.order = targetOrder
    } else if (targetOrder < currentOrder) {
      if (col.order >= targetOrder && col.order < currentOrder) {
        col.order += 1
      }
    } else if (col.order > currentOrder && col.order <= targetOrder) {
      col.order -= 1
    }
  })

  saveColumnConfig()
  markCustom()
}

function handleColumnDrop(targetKey: LogbookColumnKey): void {
  if (!draggedColumnKey.value || draggedColumnKey.value === targetKey) {
    draggedColumnKey.value = null
    return
  }

  const targetCol = columnConfig.value.find((c) => c.key === targetKey)
  if (!targetCol) {
    draggedColumnKey.value = null
    return
  }

  reorderColumns(draggedColumnKey.value, targetCol.order)
  draggedColumnKey.value = null
}

function moveColumn(key: LogbookColumnKey, direction: 'up' | 'down'): void {
  const sorted = [...columnConfig.value].sort((a, b) => a.order - b.order)
  const index = sorted.findIndex((c) => c.key === key)
  if (index < 0) return

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= sorted.length) return

  const target = sorted[swapIndex]
  reorderColumns(key, target.order)
}

function resetColumnConfig(): void {
  columnConfig.value = DEFAULT_COLUMN_CONFIG.map((c) => ({ ...c }))
  saveColumnConfig()
  activePresetId.value = 'custom'
  savePresetId()
}

function resetColumnWidths(): void {
  columnConfig.value.forEach((col) => {
    const defaultCol = DEFAULT_COLUMN_CONFIG.find((d) => d.key === col.key)
    if (defaultCol?.width) {
      col.width = defaultCol.width
    }
  })
  saveColumnConfig()
}

function startResize(columnKey: LogbookColumnKey, event: MouseEvent): void {
  const col = columnConfig.value.find((c) => c.key === columnKey)
  if (!col) return

  resizingColumn.value = columnKey
  resizeStartX.value = event.clientX
  resizeStartWidth.value = col.width ?? 100

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

function handleResize(event: MouseEvent): void {
  if (!resizingColumn.value) return

  const col = columnConfig.value.find((c) => c.key === resizingColumn.value)
  if (!col) return

  const deltaX = event.clientX - resizeStartX.value
  col.width = Math.max(50, resizeStartWidth.value + deltaX)
}

function stopResize(): void {
  if (resizingColumn.value) {
    saveColumnConfig()
  }
  resizingColumn.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

function applyPreset(presetId: EntryCardPresetId): void {
  if (presetId === 'custom') {
    activePresetId.value = 'custom'
    savePresetId()
    return
  }

  const preset = ENTRY_CARD_PRESETS.find((p) => p.id === presetId)
  if (!preset) return

  columnConfig.value.forEach((col) => {
    if (isHeaderZoneKey(col.key)) {
      col.visible = true
      return
    }
    if (isFooterZoneKey(col.key)) {
      col.visible = preset.fields.includes(col.key)
      return
    }
    col.visible = preset.fields.includes(col.key)
  })

  saveColumnConfig()
  activePresetId.value = presetId
  savePresetId()
}

export function useLogbookColumnConfig() {
  return {
    columnConfig,
    activePresetId,
    draggedColumnKey,
    resizingColumn,
    visibleColumns,
    displayColumnConfig,
    visibleDetailFields,
    showRemarksFooter,
    detailFieldCount,
    detailFieldCrowded,
    pickerFields,
    presets: ENTRY_CARD_PRESETS,
    loadColumnConfig,
    toggleColumnVisibility,
    handleColumnDrop,
    moveColumn,
    resetColumnConfig,
    resetColumnWidths,
    startResize,
    stopResize,
    applyPreset,
  }
}
