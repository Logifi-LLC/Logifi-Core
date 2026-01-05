import type { LogEntry } from './logbookTypes'
import { supabase } from '~/lib/supabase'

/**
 * Check if two entries are duplicates based on date, registration, airports, and times
 */
export function isDuplicateEntry(entry: LogEntry, existingEntry: LogEntry): boolean {
  // Must match date and registration
  if (existingEntry.date !== entry.date || 
      existingEntry.registration.toUpperCase() !== entry.registration.toUpperCase()) {
    return false
  }
  
  // Check departure and destination airports (normalize UNKNOWN and empty strings)
  const existingDep = (existingEntry.departure || 'UNKNOWN').trim().toUpperCase()
  const entryDep = (entry.departure || 'UNKNOWN').trim().toUpperCase()
  const existingDest = (existingEntry.destination || 'UNKNOWN').trim().toUpperCase()
  const entryDest = (entry.destination || 'UNKNOWN').trim().toUpperCase()
  
  // If departure or destination differs (and not both UNKNOWN), they're different flights
  if (existingDep !== entryDep || existingDest !== entryDest) {
    // Exception: if both are UNKNOWN, we'll fall through to check times
    if (!(existingDep === 'UNKNOWN' && entryDep === 'UNKNOWN' && 
          existingDest === 'UNKNOWN' && entryDest === 'UNKNOWN')) {
      return false
    }
  }
  
  // If we have OOOI times for both, compare OUT time as tiebreaker
  const existingOut = existingEntry.oooi?.out
  const entryOut = entry.oooi?.out
  if (existingOut && entryOut) {
    // If OUT times differ, they're different flights (e.g., morning vs afternoon)
    return existingOut === entryOut
  }
  
  // If OOOI not available, compare total flight time as tiebreaker
  const existingTotal = existingEntry.flightTime.total
  const entryTotal = entry.flightTime.total
  if (existingTotal !== null && existingTotal !== undefined &&
      entryTotal !== null && entryTotal !== undefined) {
    // Only consider duplicates if total times match exactly (conservative approach)
    return existingTotal === entryTotal
  }
  
  // If we don't have OOOI or total times, and airports matched (or both UNKNOWN),
  // consider them duplicates (conservative approach - matches original behavior for edge cases)
  return true
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
export async function checkDuplicatesInDatabase(entry: LogEntry, userId: string, excludeEntryId?: string): Promise<LogEntry[]> {
  try {
    // Query for entries matching date and registration (case-insensitive)
    let query = supabase
      .from('log_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', entry.date)
      .ilike('registration', entry.registration.trim())
    
    // Exclude the current entry if editing
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
    
    // Convert database entries to LogEntry format and filter by duplicate logic
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
        flightConditions: dbEntry.flight_conditions || [],
        remarks: dbEntry.remarks || '',
        flightTime: dbEntry.flight_time as any,
        performance: dbEntry.performance as any,
        oooi: dbEntry.oooi as any,
        flagged: dbEntry.flagged || false,
        version: dbEntry.version,
        isImported: dbEntry.is_imported || false,
        importSource: dbEntry.import_source || undefined,
        importBatchId: dbEntry.import_batch_id || undefined,
        originalEntryDate: dbEntry.original_entry_date || undefined,
        importMetadata: dbEntry.import_metadata || undefined
      }
      
      // Use the duplicate detection logic to verify it's actually a duplicate
      if (isDuplicateEntry(entry, existingEntry)) {
        matchingEntries.push(existingEntry)
      }
    }
    
    return matchingEntries
  } catch (error) {
    console.error('Exception checking duplicates in database:', error)
    return []
  }
}

