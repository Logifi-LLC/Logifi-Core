import type { LogEntry } from './logbookTypes'
import { supabase } from '~/lib/supabase'
import { withTimeout } from '~/utils/promiseTimeout'
import {
  entriesDuplicateMatch,
  type DuplicateEntryMatchShape,
} from '../../shared/duplicateEntryMatch'

function approachCountForMatch(entry: LogEntry): number | null {
  const approaches = entry.performance?.approaches
  if (Array.isArray(approaches) && approaches.length > 0) {
    return approaches.reduce((sum, record) => sum + (record.count || 0), 0)
  }
  return entry.performance?.approachCount ?? null
}

function logEntryToDuplicateShape(entry: LogEntry): DuplicateEntryMatchShape {
  const ft = entry.flightTime
  const perf = entry.performance
  return {
    date: entry.date,
    registration: entry.registration,
    departure: entry.departure,
    destination: entry.destination,
    oooiOut: entry.oooi?.out,
    role: entry.role,
    flightTimeTotal: ft?.total ?? null,
    pic: ft?.pic ?? null,
    sic: ft?.sic ?? null,
    dual: ft?.dual ?? null,
    solo: ft?.solo ?? null,
    night: ft?.night ?? null,
    nvg: ft?.nvg ?? null,
    actualInstrument: ft?.actualInstrument ?? null,
    simulatedInstrument: ft?.simulatedInstrument ?? null,
    dualGiven: ft?.dualGiven ?? null,
    crossCountry: ft?.crossCountry ?? null,
    dayTakeoffs: perf?.dayTakeoffs ?? null,
    nightTakeoffs: perf?.nightTakeoffs ?? null,
    dayLandings: perf?.dayLandings ?? null,
    nightLandings: perf?.nightLandings ?? null,
    approachCount: approachCountForMatch(entry),
    holdingProcedures: perf?.holdingProcedures ?? null,
  }
}

/**
 * Check if two entries are the same logged flight (date, tail, route, role, times, performance).
 */
export function isDuplicateEntry(entry: LogEntry, existingEntry: LogEntry): boolean {
  return entriesDuplicateMatch(
    logEntryToDuplicateShape(entry),
    logEntryToDuplicateShape(existingEntry),
    'standard'
  )
}

/**
 * Find all duplicate entries from a list of existing entries
 * Returns array of matching entries
 */
export function findDuplicateEntries(entry: LogEntry, existingEntries: LogEntry[]): LogEntry[] {
  return existingEntries.filter(existing => isDuplicateEntry(entry, existing))
}

/**
 * Check for duplicates in the Supabase database
 * Returns array of matching entries from the database
 */
export async function checkDuplicatesInDatabase(
  entry: LogEntry,
  userId: string,
  excludeEntryId?: string,
  timeoutMs = 2000
): Promise<LogEntry[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return []
  }

  try {
    const runQuery = async (): Promise<LogEntry[]> => {
      let query = supabase
        .from('log_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', entry.date)
        .ilike('registration', entry.registration.trim())

      if (excludeEntryId) {
        query = query.neq('id', excludeEntryId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error checking duplicates in database:', error)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      const matchingEntries: LogEntry[] = []

      for (const dbEntry of data) {
        const existingEntry: LogEntry = {
          id: dbEntry.id,
          date: dbEntry.date,
          role: dbEntry.role,
          aircraftCategoryClass: dbEntry.aircraft_category_class,
          categoryClassTime: dbEntry.category_class_time,
          aircraftMakeModel: dbEntry.aircraft_make_model,
          registration: dbEntry.registration,
          flightNumber: dbEntry.flight_number,
          departure: dbEntry.departure,
          destination: dbEntry.destination,
          route: dbEntry.route || '',
          trainingElements: dbEntry.training_elements || '',
          trainingInstructor: dbEntry.training_instructor || '',
          instructorCertificate: dbEntry.instructor_certificate || '',
          picName: dbEntry.pic_name || null,
          sicName: dbEntry.sic_name || null,
          flightConditions: dbEntry.flight_conditions || [],
          remarks: dbEntry.remarks || '',
          tags: Array.isArray(dbEntry.tags) ? dbEntry.tags : [],
          flightTime: dbEntry.flight_time as any,
          performance: dbEntry.performance as any,
          oooi: dbEntry.oooi as any,
          flagged: dbEntry.flagged || false,
          version: dbEntry.version,
          isImported: dbEntry.is_imported || false,
          importSource: dbEntry.import_source || undefined,
          importBatchId: dbEntry.import_batch_id || undefined,
          originalEntryDate: dbEntry.original_entry_date || undefined,
          importMetadata: dbEntry.import_metadata || undefined,
        }

        if (isDuplicateEntry(entry, existingEntry)) {
          matchingEntries.push(existingEntry)
        }
      }

      return matchingEntries
    }

    return await withTimeout(runQuery(), timeoutMs, 'Duplicate check')
  } catch (error) {
    console.warn('Duplicate check skipped or timed out:', error)
    return []
  }
}

/**
 * Local-first duplicate detection with optional Supabase reconciliation.
 */
export async function checkDuplicatesWithLocalFallback(
  entry: LogEntry,
  userId: string,
  localEntries: LogEntry[],
  excludeEntryId?: string,
  timeoutMs = 2000
): Promise<LogEntry[]> {
  const localMatches = findDuplicateEntries(
    entry,
    localEntries.filter((existing) => existing.id !== excludeEntryId)
  )

  if (localMatches.length > 0) {
    return localMatches
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return []
  }

  return checkDuplicatesInDatabase(entry, userId, excludeEntryId, timeoutMs)
}

