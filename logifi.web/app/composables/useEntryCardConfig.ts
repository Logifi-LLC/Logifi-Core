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

const COLUMN_CONFIG_STORAGE_KEY = 'logifi-logbook-columns'
const PRESET_STORAGE_KEY = 'logifi-entry-card-preset'

const isBrowser = typeof window !== 'undefined'

const columnConfig = ref<LogbookColumnConfig[]>(DEFAULT_COLUMN_CONFIG.map((c) => ({ ...c })))
const activePresetId = ref<EntryCardPresetId>('custom')
const draggedColumnKey = ref<LogbookColumnKey | null>(null)

function saveColumnConfig(): void {
  if (!isBrowser) return
  window.localStorage.setItem(COLUMN_CONFIG_STORAGE_KEY, JSON.stringify(columnConfig.value))
}

function savePresetId(): void {
  if (!isBrowser) return
  window.localStorage.setItem(PRESET_STORAGE_KEY, activePresetId.value)
}

function loadColumnConfig(): void {
  if (!isBrowser) return
  const saved = window.localStorage.getItem(COLUMN_CONFIG_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as LogbookColumnConfig[]
      if (Array.isArray(parsed)) {
        const merged = DEFAULT_COLUMN_CONFIG.map((defaultCol) => {
          const savedCol = parsed.find((p) => p.key === defaultCol.key)
          if (savedCol) {
            return {
              ...savedCol,
              required: defaultCol.required,
              label: defaultCol.label,
              responsiveClass: defaultCol.responsiveClass,
              width: savedCol.width ?? defaultCol.width,
              visible: isHeaderZoneKey(defaultCol.key) ? true : savedCol.visible,
            }
          }
          return { ...defaultCol }
        })
        merged.forEach((col) => {
          if (isHeaderZoneKey(col.key) || col.required) col.visible = true
        })
        columnConfig.value = merged
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
  const saved = window.localStorage.getItem(PRESET_STORAGE_KEY) as EntryCardPresetId | null
  if (saved && (saved === 'custom' || ENTRY_CARD_PRESETS.some((p) => p.id === saved))) {
    activePresetId.value = saved
  }
}

const visibleColumns = computed(() =>
  columnConfig.value.filter((col) => col.visible).sort((a, b) => a.order - b.order),
)

const visibleDetailFields = computed(() =>
  visibleColumns.value.filter((col) => isDetailChipKey(col.key)),
)

const showRemarksFooter = computed(() =>
  columnConfig.value.some((col) => col.key === 'remarks' && col.visible),
)

const detailFieldCount = computed(() => visibleDetailFields.value.length)

const detailFieldCrowded = computed(() => detailFieldCount.value > 8)

/** Fields available in the preferences picker (excludes fixed header fields). */
const pickerFields = computed(() =>
  [...columnConfig.value].sort((a, b) => a.order - b.order),
)

function markCustom(): void {
  activePresetId.value = 'custom'
  savePresetId()
}

function toggleColumnVisibility(key: LogbookColumnKey): void {
  if (isHeaderZoneKey(key)) return

  const col = columnConfig.value.find((c) => c.key === key)
  if (!col || col.required) return

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
  if (isHeaderZoneKey(key)) return

  const sorted = [...columnConfig.value].sort((a, b) => a.order - b.order)
  const index = sorted.findIndex((c) => c.key === key)
  if (index < 0) return

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= sorted.length) return

  const target = sorted[swapIndex]
  if (isHeaderZoneKey(target.key)) return

  reorderColumns(key, target.order)
}

function resetColumnConfig(): void {
  columnConfig.value = DEFAULT_COLUMN_CONFIG.map((c) => ({ ...c }))
  saveColumnConfig()
  activePresetId.value = 'custom'
  savePresetId()
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

export function useEntryCardConfig() {
  return {
    columnConfig,
    activePresetId,
    draggedColumnKey,
    visibleColumns,
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
    applyPreset,
  }
}
