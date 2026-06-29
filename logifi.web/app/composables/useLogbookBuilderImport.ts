import { unref } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
  createEmptyOOOI,
  getApproachesFromPerformance,
} from '~/utils/logbookTypes'
import {
  buildDigifiFeedbackContextFromRow,
  buildDigifiFeedbackContextKey,
  normalizeDigifiFeedbackValue,
} from '~/utils/digifiFeedback'
import type { BuilderRow, BuilderColumn } from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { useValidation } from '~/composables/useValidation'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import {
  saveSyncedEntryToIndexedDB,
  initIndexedDB,
  getAllEntriesFromIndexedDB,
} from '~/utils/indexedDB'
import { clearBuilderDraft } from '~/composables/useLogbookBuilderDraft'
import {
  buildAircraftTailIndex,
  type AircraftTailIndex,
  resolveAircraftByTail,
} from '../../shared/aircraftTailIndex'
import {
  applySimulatorImport,
  inferLogbookType,
  parseSimDeviceType,
  type SimDeviceType,
} from '~/utils/importSimulator'

/** Mirror of sanitizeFlightConditions from index.vue for builder import. */
function sanitizeFlightConditions(conditions: string[]): string[] {
  return (conditions || [])
    .filter(Boolean)
    .filter((c) => c !== 'dayVfr')
    .map((c) => (c === 'Cross-Country' ? 'crossCountry' : c))
    .filter((c, i, arr) => arr.indexOf(c) === i)
}

function generateEntryId(): string {
  return crypto.randomUUID?.() ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseDecimal(val: string | undefined): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = parseFloat(String(val).trim())
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null
}

function parseFromTo(val: string): { departure: string; destination: string; route: string } {
  const raw = (val || '').trim()
  const parts = raw.split(/\s*[→\-–]\s*|\s+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return {
      departure: parts[0] || 'UNKNOWN',
      destination: parts[1] || 'UNKNOWN',
      route: parts.slice(2).join(' ') || '',
    }
  }
  if (parts.length === 1) {
    return { departure: parts[0] || 'UNKNOWN', destination: 'UNKNOWN', route: '' }
  }
  return { departure: 'UNKNOWN', destination: 'UNKNOWN', route: '' }
}

export interface GridToEntriesOptions {
  columns: BuilderColumn[]
  rows: BuilderRow[]
  /** Default role when no Role column value (e.g. 'Dual Received'). */
  defaultRole?: string
  /** Default year when date is partial (e.g. MM/DD). Null = use current year. */
  defaultYear?: number | null
  /** Known tail → make/model index from existing logbook entries. */
  tailIndex?: AircraftTailIndex
}

async function loadTailIndexForImport(userId: string): Promise<AircraftTailIndex> {
  await initIndexedDB()
  const entries = await getAllEntriesFromIndexedDB(userId)
  return buildAircraftTailIndex(entries)
}

/** Parse YYYY-MM-DD to { y, m, d } or null. */
function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const match = (iso || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return null
  const y = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const d = parseInt(match[3], 10)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) return null
  return { y, m, d }
}

/** Normalize date string to YYYY-MM-DD. Handles MM/DD, M/D, MM-DD, MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD.
* When date is MM/DD only: uses defaultYear; if lastDateIso is set and (defaultYear, MM, DD) would be
* before or equal to lastDateIso (e.g. Dec 28 -> Jan 5), uses defaultYear+1 so the page can span year-end.
* When date is MM/DD/YY: uses the same century as defaultYear/current year and lets YY override the year. */
function normalizeDateWithRollover(
  dateStr: string,
  defaultYear: number | null | undefined,
  lastDateIso: string | null
): string {
  const s = (dateStr || '').trim()
  if (!s) return ''
  const year = typeof defaultYear === 'number' && Number.isFinite(defaultYear) ? defaultYear : new Date().getFullYear()
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s
  const slashParts = s.split(/[/-]/).map((p) => p.trim())
  if (slashParts.length === 2) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y = year
      const last = lastDateIso ? parseIsoDate(lastDateIso) : null
      if (last) {
        const candidateTime = new Date(y, m - 1, d).getTime()
        const lastTime = new Date(last.y, last.m - 1, last.d).getTime()
        if (candidateTime <= lastTime) y = year + 1
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  if (slashParts.length === 3) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    const yRaw = slashParts[2]
    const parsedY = parseInt(yRaw, 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y: number
      if (!Number.isFinite(parsedY)) {
        // Fall back to the default/base year if year part is not a valid number.
        y = year
      } else if (yRaw.length === 2) {
        // Two-digit year: keep the same century as the base year and override the last two digits.
        const century = Math.floor(year / 100) * 100
        y = century + parsedY
      } else if (parsedY >= 1000) {
        // Full four-digit year: use as-is.
        y = parsedY
      } else {
        // Short/ambiguous year (e.g. "5"): fall back to the base year.
        y = year
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return s
}

/** Normalize role from builder cell (e.g. "Student" -> "Dual Received"). */
function normalizeRoleFromCell(val: string): string {
  const v = (val || '').trim()
  if (!v) return ''
  if (/student|dual\s*received/i.test(v)) return 'Dual Received'
  return v
}

/** Build LogEntry[] from grid rows using column mapping. Only includes rows that have at least one non-empty cell. */
export function gridToEntries(options: GridToEntriesOptions): LogEntry[] {
  const { columns, rows, defaultRole = 'PIC', defaultYear, tailIndex } = options
  const sortedCols = [...columns].sort((a, b) => a.order - b.order)
  const entries: LogEntry[] = []
  let lastDateIso: string | null = null

  for (const row of rows) {
    const cells = row.cells ?? {}
    const hasAny = sortedCols.some((col) => (cells[col.id] ?? '').trim() !== '')
    if (!hasAny) continue

    const flightTime = createEmptyFlightTime()
    const performance = createEmptyPerformance()
    let date = ''
    let departure = 'UNKNOWN'
    let destination = 'UNKNOWN'
    let route = ''
    let aircraftMakeModel = 'Unknown'
    let registration = ''
    let aircraftCategoryClass = ''
    let remarks = ''
    let flightConditions: string[] = []
    let isSimulator = false
    let simulatorCellValue = ''
    let simDeviceType: SimDeviceType | null = null
    let rowRole = ''
    let trainingElements = ''
    let trainingInstructor = ''

    for (const col of sortedCols) {
      const val = (cells[col.id] ?? '').trim()
      const key = col.fieldKey
      if (!key) continue
      switch (key) {
        case 'date':
          date = val || date
          break
        case 'fromTo': {
          const ft = parseFromTo(val)
          if (ft.departure !== 'UNKNOWN' || ft.destination !== 'UNKNOWN') {
            departure = ft.departure
            destination = ft.destination
            route = ft.route
          }
          break
        }
        case 'departure':
          if (val) departure = val
          break
        case 'destination':
          if (val) destination = val
          break
        case 'route':
          if (val) route = val
          break
        case 'simulator':
          if (val.trim()) {
            isSimulator = true
            simulatorCellValue = val
            const fromCell = parseSimDeviceType(val)
            if (fromCell) simDeviceType = fromCell
          }
          break
        case 'role':
          if (val) rowRole = normalizeRoleFromCell(val) || val.trim()
          break
        case 'categoryClass': {
          const ccVal = (col as { categoryClassValue?: string }).categoryClassValue
          if (ccVal && val) {
            aircraftCategoryClass = ccVal
            flightTime.total = parseDecimal(val) ?? flightTime.total
          } else if (val) {
            aircraftCategoryClass = val.trim()
          }
          const fromCategory = parseSimDeviceType(aircraftCategoryClass)
          if (fromCategory && !isSimulator) {
            isSimulator = true
            simDeviceType = fromCategory
          }
          break
        }
        case 'aircraft':
          if (val) aircraftMakeModel = val
          break
        case 'identification':
          if (val) registration = val
          break
        case 'flightNumber':
          break
        case 'conditions':
          if (val) {
            const tokens = val.split(/[;,]/).map((c) => c.trim()).filter(Boolean)
            flightConditions = sanitizeFlightConditions(tokens)
          }
          break
        case 'remarks':
          if (val) remarks = val
          break
        case 'pic':
          flightTime.pic = parseDecimal(val) ?? flightTime.pic
          break
        case 'sic':
          flightTime.sic = parseDecimal(val) ?? flightTime.sic
          break
        case 'dualR':
          flightTime.dual = parseDecimal(val) ?? flightTime.dual
          break
        case 'solo':
          flightTime.solo = parseDecimal(val) ?? flightTime.solo
          break
        case 'night':
          flightTime.night = parseDecimal(val) ?? flightTime.night
          break
        case 'nvg':
          flightTime.nvg = parseDecimal(val) ?? flightTime.nvg
          break
        case 'actual':
          flightTime.actualInstrument = parseDecimal(val) ?? flightTime.actualInstrument
          break
        case 'hood':
          flightTime.simulatedInstrument = parseDecimal(val) ?? flightTime.simulatedInstrument
          break
        case 'dualG':
          flightTime.dualGiven = parseDecimal(val) ?? flightTime.dualGiven
          break
        case 'xc':
          flightTime.crossCountry = parseDecimal(val) ?? flightTime.crossCountry
          break
        case 'dayLandings':
          performance.dayLandings = parseDecimal(val) ?? performance.dayLandings
          break
        case 'nightLandings':
          performance.nightLandings = parseDecimal(val) ?? performance.nightLandings
          break
        case 'approach':
          performance.approachCount = parseDecimal(val) ?? performance.approachCount
          break
        case 'approachType':
          if (val) performance.approachType = val
          break
        case 'pilots':
          if (val) trainingElements = val
          break
        case 'pilotRole':
          if (val) trainingInstructor = val
          break
        case 'total':
          flightTime.total = parseDecimal(val) ?? flightTime.total
          break
        default:
          break
      }
    }

    const rawDateStr = date
    const baseYear =
      typeof defaultYear === 'number' && Number.isFinite(defaultYear)
        ? defaultYear
        : new Date().getFullYear()
    date = normalizeDateWithRollover(date, defaultYear, lastDateIso)
    if (!date) date = new Date().toISOString().slice(0, 10)
    if (rawDateStr.trim()) {
      lastDateIso = date

      // If the user entered a two-digit year (MM/DD/YY) and it changed the year
      // away from the builder's base/default year, append a note to remarks.
      const overrideMatch = rawDateStr.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
      const parsedNorm = parseIsoDate(date)
      if (overrideMatch && parsedNorm && parsedNorm.y !== baseYear) {
        const note = `Date year override (builder): ${rawDateStr.trim()} → ${date}`
        remarks = remarks ? `${remarks} | ${note}` : note
      }
    }

    if ((flightTime.night ?? 0) > 0 && !flightConditions.includes('nightVfr')) {
      flightConditions = [...flightConditions, 'nightVfr']
    }
    if ((flightTime.actualInstrument ?? 0) > 0) {
      if (!flightConditions.includes('actualInstrument')) flightConditions = [...flightConditions, 'actualInstrument']
      if (!flightConditions.includes('ifr')) flightConditions = [...flightConditions, 'ifr']
    }
    if ((flightTime.crossCountry ?? 0) > 0 && !flightConditions.includes('crossCountry')) {
      flightConditions = [...flightConditions, 'crossCountry']
    }
    if ((flightTime.simulatedInstrument ?? 0) > 0 && !flightConditions.includes('simInstrument')) {
      flightConditions = [...flightConditions, 'simInstrument']
    }
    flightConditions = sanitizeFlightConditions(flightConditions)

    if (tailIndex && registration.trim()) {
      const resolved = resolveAircraftByTail(registration, aircraftMakeModel, tailIndex)
      aircraftMakeModel = resolved.aircraftMakeModel
      if (resolved.aircraftCategoryClass && !aircraftCategoryClass.trim()) {
        aircraftCategoryClass = resolved.aircraftCategoryClass
      }
    }

    // Ensure structured approaches array is populated for imported entries.
    if (!performance.approaches || performance.approaches.length === 0) {
      performance.approaches = getApproachesFromPerformance(performance)
    }

    const entry: LogEntry = {
      id: generateEntryId(),
      date,
      role: rowRole || defaultRole,
      aircraftCategoryClass: aircraftCategoryClass || 'Airplane Single Engine Land',
      categoryClassTime: null,
      aircraftMakeModel: aircraftMakeModel || 'Unknown',
      registration: registration || 'N00000',
      flightNumber: null,
      departure,
      destination,
      route,
      trainingElements,
      trainingInstructor,
      instructorCertificate: '',
      flightConditions,
      remarks,
      tags: row.tags?.filter(Boolean) ?? [],
      logbookType: isSimulator ? 'simulator' : 'flight',
      flightTime,
      performance,
      oooi: createEmptyOOOI(),
      flagged: false,
      isImported: true,
      importSource: 'logbook_builder',
    }
    applySimulatorImport(entry, {
      isSimulator,
      simDeviceType,
      simulatorCellValue: simulatorCellValue || undefined,
    })
    entry.logbookType = inferLogbookType(entry)

    let conditions = [...entry.flightConditions]
    const ft = entry.flightTime
    if ((ft.night ?? 0) > 0 && !conditions.includes('nightVfr')) {
      conditions = [...conditions, 'nightVfr']
    }
    if ((ft.actualInstrument ?? 0) > 0) {
      if (!conditions.includes('actualInstrument')) conditions = [...conditions, 'actualInstrument']
      if (!conditions.includes('ifr')) conditions = [...conditions, 'ifr']
    }
    if ((ft.crossCountry ?? 0) > 0 && !conditions.includes('crossCountry')) {
      conditions = [...conditions, 'crossCountry']
    }
    if ((ft.simulatedInstrument ?? 0) > 0 && !conditions.includes('simInstrument')) {
      conditions = [...conditions, 'simInstrument']
    }
    if ((ft.nvg ?? 0) > 0 && !conditions.includes('nvg')) {
      conditions = [...conditions, 'nvg']
    }
    entry.flightConditions = sanitizeFlightConditions(conditions)

    entries.push(entry)
  }
  return entries
}

/** Summable numeric field keys (times, landings, approaches). */
const SUMMABLE_FIELD_KEYS = new Set<LogbookColumnKey>([
  'pic', 'sic', 'dualR', 'solo', 'night', 'nvg', 'actual', 'hood', 'dualG', 'xc',
  'dayLandings', 'nightLandings', 'approach', 'total',
])

/** Integer-valued summable keys (no decimals in display). */
const INTEGER_FIELD_KEYS = new Set<LogbookColumnKey>(['dayLandings', 'nightLandings', 'approach'])

function getEntryNumericValue(entry: LogEntry, fieldKey: LogbookColumnKey): number {
  const ft = entry.flightTime ?? createEmptyFlightTime()
  const perf = entry.performance ?? createEmptyPerformance()
  switch (fieldKey) {
    case 'pic': return ft.pic ?? 0
    case 'sic': return ft.sic ?? 0
    case 'dualR': return ft.dual ?? 0
    case 'solo': return ft.solo ?? 0
    case 'night': return ft.night ?? 0
    case 'nvg': return ft.nvg ?? 0
    case 'actual': return ft.actualInstrument ?? 0
    case 'hood': return ft.simulatedInstrument ?? 0
    case 'dualG': return ft.dualGiven ?? 0
    case 'xc': return ft.crossCountry ?? 0
    case 'total': return ft.total ?? 0
    case 'dayLandings': return perf.dayLandings ?? 0
    case 'nightLandings': return perf.nightLandings ?? 0
    case 'approach': return perf.approachCount ?? 0
    default: return 0
  }
}

export interface ColumnTotalRow {
  fieldKey: LogbookColumnKey
  label: string
  total: number
  isInteger: boolean
}

export interface ValidateOnlyResult {
  valid: boolean
  errors: { rowIndex: number; message: string }[]
  validRowCount?: number
  columnTotals?: ColumnTotalRow[]
}

export async function validateOnly(
  grid: ReturnType<typeof useLogbookBuilderGrid>
): Promise<ValidateOnlyResult> {
  const result: ValidateOnlyResult = { valid: false, errors: [] }
  const { validateEntry } = useValidation()
  const { isAuthenticated, user } = useAuth()

  const tailIndex =
    isAuthenticated.value && user.value
      ? await loadTailIndexForImport(user.value.id)
      : undefined

  const entries = gridToEntries({
    columns: grid.columns.value,
    rows: grid.rows.value,
    defaultRole: grid.defaultImportRole?.value ?? 'PIC',
    defaultYear: unref((grid as { defaultYear?: { value: number | null } }).defaultYear) ?? null,
    tailIndex,
  })

  if (entries.length === 0) {
    result.errors.push({ rowIndex: -1, message: 'No rows with data to import.' })
    return result
  }

  if (!isAuthenticated.value || !user.value) {
    result.errors.push({ rowIndex: -1, message: 'Please sign in to import entries.' })
    return result
  }

  const digifiBlockers = grid.getDigifiImportBlockers?.() ?? []
  if (digifiBlockers.length > 0) {
    result.errors = digifiBlockers.map((message) => ({ rowIndex: -1, message }))
    return result
  }

  const validationErrors: { rowIndex: number; message: string }[] = []
  for (let i = 0; i < entries.length; i++) {
    const results = await validateEntry(entries[i])
    const firstError = results.find((r) => r.type === 'error')
    if (firstError) {
      validationErrors.push({ rowIndex: i + 1, message: firstError.message })
    }
  }
  if (validationErrors.length > 0) {
    result.errors = validationErrors
    return result
  }

  const sortedCols = [...grid.columns.value].sort((a, b) => a.order - b.order)
  const columnTotals: ColumnTotalRow[] = []
  const seenKeys = new Set<LogbookColumnKey>()
  const rows = grid.rows.value
  for (const col of sortedCols) {
    const key = col.fieldKey
    const ccVal = (col as { categoryClassValue?: string }).categoryClassValue
    if (key === 'categoryClass' && ccVal) {
      let total = 0
      for (const row of rows) {
        const val = (row.cells?.[col.id] ?? '').trim()
        total += parseDecimal(val) ?? 0
      }
      columnTotals.push({
        fieldKey: 'total',
        label: col.label,
        total: Math.round(total * 10) / 10,
        isInteger: false,
      })
      continue
    }
    if (!key || !SUMMABLE_FIELD_KEYS.has(key) || seenKeys.has(key)) continue
    seenKeys.add(key)
    let total = 0
    for (const entry of entries) {
      total += getEntryNumericValue(entry, key)
    }
    const isInteger = INTEGER_FIELD_KEYS.has(key)
    columnTotals.push({
      fieldKey: key,
      label: col.label,
      total: isInteger ? Math.round(total) : Math.round(total * 10) / 10,
      isInteger,
    })
  }

  result.valid = true
  result.errors = []
  result.validRowCount = entries.length
  result.columnTotals = columnTotals
  return result
}

export interface ValidateAndImportResult {
  imported: number
  errors: { rowIndex: number; message: string }[]
}

interface PendingDigifiCorrectionFeedback {
  fieldKey: LogbookColumnKey
  rawValue: string
  rawValueKey: string
  correctedValue: string
  correctedValueKey: string
  contextKey: string
  context: Record<string, unknown>
  scanResolvedValue: string
  scanStrategy: string
}

function collectDigifiCorrectionFeedback(
  grid: ReturnType<typeof useLogbookBuilderGrid>
): PendingDigifiCorrectionFeedback[] {
  const sortedColumns = [...grid.columns.value].sort((a, b) => a.order - b.order)
  const feedbackItems = new Map<string, PendingDigifiCorrectionFeedback>()

  for (const row of grid.rows.value) {
    const context = buildDigifiFeedbackContextFromRow(row, sortedColumns)
    for (const column of sortedColumns) {
      const meta = row.digifiCellMeta?.[column.id]
      const fieldKey = meta?.fieldKey ?? column.fieldKey
      if (!meta || !fieldKey) continue

      const rawValue = (meta.rawValue ?? '').trim()
      const scanResolvedValue = (meta.resolvedValue ?? '').trim()
      const correctedValue = (row.cells?.[column.id] ?? '').trim()
      if (!rawValue || !correctedValue || correctedValue === scanResolvedValue) continue

      const rawValueKey = normalizeDigifiFeedbackValue(fieldKey, rawValue)
      const correctedValueKey = normalizeDigifiFeedbackValue(fieldKey, correctedValue)
      if (!rawValueKey || !correctedValueKey || rawValueKey === correctedValueKey) continue

      const contextKey = buildDigifiFeedbackContextKey(fieldKey, context)
      const dedupeKey = [fieldKey, rawValueKey, correctedValueKey, contextKey].join('|')
      feedbackItems.set(dedupeKey, {
        fieldKey,
        rawValue,
        rawValueKey,
        correctedValue,
        correctedValueKey,
        contextKey,
        context: {
          ...context,
          scanResolvedValue,
        },
        scanResolvedValue,
        scanStrategy: meta.strategy,
      })
    }
  }

  return [...feedbackItems.values()]
}

async function persistDigifiCorrectionFeedback(
  grid: ReturnType<typeof useLogbookBuilderGrid>,
  userId: string
): Promise<void> {
  const feedbackItems = collectDigifiCorrectionFeedback(grid)
  if (feedbackItems.length === 0) return

  for (const item of feedbackItems) {
    const { data: existing, error: selectError } = await (supabase as any)
      .from('digifi_correction_feedback')
      .select('id, sample_count')
      .eq('user_id', userId)
      .eq('field_key', item.fieldKey)
      .eq('raw_value_key', item.rawValueKey)
      .eq('corrected_value_key', item.correctedValueKey)
      .eq('context_key', item.contextKey)
      .maybeSingle()

    if (selectError) throw selectError

    if (existing?.id) {
      const { error: updateError } = await (supabase as any)
        .from('digifi_correction_feedback')
        .update({
          raw_value: item.rawValue,
          corrected_value: item.correctedValue,
          context: item.context,
          sample_count: (existing.sample_count ?? 0) + 1,
          last_corrected_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (updateError) throw updateError
      continue
    }

    const { error: insertError } = await (supabase as any)
      .from('digifi_correction_feedback')
      .insert({
        user_id: userId,
        field_key: item.fieldKey,
        raw_value: item.rawValue,
        raw_value_key: item.rawValueKey,
        corrected_value: item.correctedValue,
        corrected_value_key: item.correctedValueKey,
        context_key: item.contextKey,
        context: {
          ...item.context,
          scanStrategy: item.scanStrategy,
        },
        sample_count: 1,
      })
    if (insertError) throw insertError
  }
}

export async function runValidateAndImport(
  grid: ReturnType<typeof useLogbookBuilderGrid>
): Promise<ValidateAndImportResult> {
  const result: ValidateAndImportResult = { imported: 0, errors: [] }
  const { validateEntry } = useValidation()
  const { isAuthenticated, user } = useAuth()

  const tailIndex =
    isAuthenticated.value && user.value
      ? await loadTailIndexForImport(user.value.id)
      : undefined

  const entries = gridToEntries({
    columns: grid.columns.value,
    rows: grid.rows.value,
    defaultRole: grid.defaultImportRole?.value ?? 'PIC',
    defaultYear: unref((grid as { defaultYear?: { value: number | null } }).defaultYear) ?? null,
    tailIndex,
  })

  if (entries.length === 0) {
    result.errors.push({ rowIndex: -1, message: 'No rows with data to import.' })
    return result
  }

  if (!isAuthenticated.value || !user.value) {
    result.errors.push({ rowIndex: -1, message: 'Please sign in to import entries.' })
    return result
  }

  const digifiBlockers = grid.getDigifiImportBlockers?.() ?? []
  if (digifiBlockers.length > 0) {
    result.errors = digifiBlockers.map((message) => ({ rowIndex: -1, message }))
    return result
  }

  const validationErrors: { rowIndex: number; message: string }[] = []
  for (let i = 0; i < entries.length; i++) {
    const results = await validateEntry(entries[i])
    const firstError = results.find((r) => r.type === 'error')
    if (firstError) {
      validationErrors.push({ rowIndex: i + 1, message: firstError.message })
    }
  }
  if (validationErrors.length > 0) {
    result.errors = validationErrors
    return result
  }

  await initIndexedDB()
  let importBatchId: string | null = null

  if (isAuthenticated.value && user.value) {
    try {
      const { data: batch, error: batchError } = await (supabase as any)
        .from('import_batches')
        .insert({
          user_id: user.value.id,
          source_type: 'logbook_builder',
          file_name: null,
          file_size: null,
          total_entries: entries.length,
          successful_imports: 0,
          duplicates_skipped: 0,
          errors: 0,
          import_metadata: { importedAt: new Date().toISOString() },
        })
        .select()
        .single()
      if (batchError) throw batchError
      importBatchId = (batch as any).id
    } catch (e: any) {
      result.errors.push({ rowIndex: -1, message: e?.message ?? 'Failed to create import batch' })
      return result
    }
  }

  for (const entry of entries) {
    const importedAt = new Date().toISOString()
    const dbEntry = {
      id: entry.id,
      user_id: user.value?.id,
      date: entry.date,
      role: entry.role,
      aircraft_category_class: entry.aircraftCategoryClass,
      category_class_time: entry.categoryClassTime,
      aircraft_make_model: entry.aircraftMakeModel,
      registration: entry.registration,
      flight_number: entry.flightNumber,
      departure: entry.departure,
      destination: entry.destination,
      route: entry.route,
      training_elements: entry.trainingElements,
      training_instructor: entry.trainingInstructor,
      instructor_certificate: entry.instructorCertificate,
      flight_conditions: entry.flightConditions,
      tags: entry.tags ?? [],
      remarks: entry.remarks,
      logbook_type: entry.logbookType ?? 'flight',
      flight_time: entry.flightTime,
      performance: entry.performance,
      oooi: entry.oooi,
      flagged: entry.flagged ?? false,
      is_imported: true,
      import_source: 'logbook_builder',
      import_batch_id: importBatchId,
      original_entry_date: entry.date ? new Date(entry.date).toISOString() : null,
      import_metadata: { importedAt },
    }
    let insertedRow: any = null

    if (isAuthenticated.value && user.value) {
      try {
        const { data, error: insertError } = await (supabase as any)
          .from('log_entries')
          .insert(dbEntry)
          .select()
          .single()
        if (insertError) throw insertError
        insertedRow = data
      } catch (e: any) {
        result.errors.push({
          rowIndex: -1,
          message: `Save failed: ${e?.message ?? 'Unknown error'}`,
        })
        continue
      }
    }

    const entryToStore: LogEntry = {
      ...entry,
      isImported: true,
      importSource: 'logbook_builder',
      importBatchId: importBatchId ?? undefined,
      originalEntryDate: entry.date,
      importMetadata: { importedAt },
      version: insertedRow?.version ?? entry.version,
      dataHash: insertedRow?.data_hash ?? entry.dataHash,
      createdAt: insertedRow?.created_at ?? entry.createdAt,
      updatedAt: insertedRow?.updated_at ?? entry.updatedAt,
    }
    try {
      await saveSyncedEntryToIndexedDB(entryToStore, user.value!.id)
    } catch (_) {
      // non-fatal
    }
    result.imported++
  }

  if (importBatchId && isAuthenticated.value && user.value) {
    try {
      await (supabase as any)
        .from('import_batches')
        .update({
          successful_imports: result.imported,
          duplicates_skipped: 0,
          errors: result.errors.length,
        })
        .eq('id', importBatchId)
    } catch (_) {}
  }

  if (result.imported > 0 && isAuthenticated.value && user.value) {
    try {
      await persistDigifiCorrectionFeedback(grid, user.value.id)
    } catch (error) {
      console.warn('[digifi] failed to persist correction feedback', error)
    }
  }

  if (result.imported > 0) {
    grid.clearGrid()
    clearBuilderDraft(user.value?.id)
  }
  return result
}
