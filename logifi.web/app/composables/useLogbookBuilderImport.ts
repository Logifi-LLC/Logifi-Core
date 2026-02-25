import type { LogEntry } from '~/utils/logbookTypes'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
  createEmptyOOOI,
} from '~/utils/logbookTypes'
import type { BuilderRow, BuilderColumn } from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import { useValidation } from '~/composables/useValidation'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import {
  saveEntryToIndexedDB,
  initIndexedDB,
} from '~/utils/indexedDB'

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
}

/** Build LogEntry[] from grid rows using column mapping. Only includes rows that have at least one non-empty cell. */
export function gridToEntries(options: GridToEntriesOptions): LogEntry[] {
  const { columns, rows } = options
  const sortedCols = [...columns].sort((a, b) => a.order - b.order)
  const entries: LogEntry[] = []

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
        case 'pilots':
          break
        case 'total':
          flightTime.total = parseDecimal(val) ?? flightTime.total
          break
        default:
          break
      }
    }

    if (!date) date = new Date().toISOString().slice(0, 10)

    const entry: LogEntry = {
      id: generateEntryId(),
      date,
      role: 'PIC',
      aircraftCategoryClass: aircraftCategoryClass || 'Airplane Single Engine Land',
      categoryClassTime: null,
      aircraftMakeModel: aircraftMakeModel || 'Unknown',
      registration: registration || 'N00000',
      flightNumber: null,
      departure,
      destination,
      route,
      trainingElements: '',
      trainingInstructor: '',
      instructorCertificate: '',
      flightConditions,
      remarks,
      tags: row.tags?.filter(Boolean) ?? [],
      logbookType: 'flight',
      flightTime,
      performance,
      oooi: createEmptyOOOI(),
      flagged: false,
      isImported: true,
      importSource: 'logbook_builder',
    }
    entries.push(entry)
  }
  return entries
}

export interface ValidateAndImportResult {
  imported: number
  errors: { rowIndex: number; message: string }[]
}

export async function runValidateAndImport(
  grid: ReturnType<typeof useLogbookBuilderGrid>
): Promise<ValidateAndImportResult> {
  const result: ValidateAndImportResult = { imported: 0, errors: [] }
  const { validateEntry } = useValidation()
  const { isAuthenticated, user } = useAuth()

  const entries = gridToEntries({
    columns: grid.columns.value,
    rows: grid.rows.value,
  })

  if (entries.length === 0) {
    result.errors.push({ rowIndex: -1, message: 'No rows with data to import.' })
    return result
  }

  if (!isAuthenticated.value || !user.value) {
    result.errors.push({ rowIndex: -1, message: 'Please sign in to import entries.' })
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
      import_metadata: { importedAt: new Date().toISOString() },
    }

    if (isAuthenticated.value && user.value) {
      try {
        await (supabase as any).from('log_entries').insert(dbEntry).select().single()
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
      importMetadata: { importedAt: new Date().toISOString() },
    }
    try {
      await saveEntryToIndexedDB(entryToStore)
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

  if (result.imported > 0) {
    grid.clearGrid()
  }
  return result
}
