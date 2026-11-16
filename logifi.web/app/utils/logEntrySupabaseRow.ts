import { sanitizeFlightConditions } from './flightConditions'
import type {
  FlightTimeBreakdown,
  LogEntry,
  OOOITimes,
  PerformanceMetrics,
} from './logbookTypes'

/**
 * Client LogEntry keys the canonical mapper round-trips.
 * Update this list when adding a LogEntry field.
 */
export const LOG_ENTRY_MAPPED_KEYS = [
  'id',
  'date',
  'role',
  'aircraftCategoryClass',
  'categoryClassTime',
  'aircraftMakeModel',
  'registration',
  'flightNumber',
  'departure',
  'destination',
  'route',
  'trainingElements',
  'trainingInstructor',
  'instructorCertificate',
  'picName',
  'sicName',
  'flightConditions',
  'remarks',
  'tags',
  'logbookType',
  'flightTime',
  'performance',
  'oooi',
  'flagged',
  'version',
  'dataHash',
  'createdAt',
  'updatedAt',
  'signaturePending',
  'pendingInstructorId',
  'amendsEntryId',
  'isVoid',
  'importedSignatureDisplay',
  'isImported',
  'importSource',
  'importBatchId',
  'originalEntryDate',
  'importMetadata',
] as const

/**
 * log_entries columns the canonical mapper knows.
 * Update this list when adding a DB column (including schema columns missing from database.ts).
 */
export const LOG_ENTRIES_MAPPED_COLUMNS = [
  'id',
  'user_id',
  'date',
  'role',
  'aircraft_category_class',
  'category_class_time',
  'aircraft_make_model',
  'registration',
  'flight_number',
  'departure',
  'destination',
  'route',
  'training_elements',
  'training_instructor',
  'instructor_certificate',
  'pic_name',
  'sic_name',
  'flight_conditions',
  'tags',
  'remarks',
  'flight_time',
  'performance',
  'oooi',
  'flagged',
  'created_at',
  'updated_at',
  'data_hash',
  'version',
  'is_imported',
  'import_source',
  'import_batch_id',
  'original_entry_date',
  'import_metadata',
  'fcv_flight_id',
  'signature_pending',
  'pending_instructor_id',
  'amends_entry_id',
  'is_void',
  'logbook_type',
] as const

/** Assigned by Postgres / triggers; not sent on client insert/update payloads. */
export const LOG_ENTRIES_SERVER_OWNED_COLUMNS = [
  'created_at',
  'updated_at',
  'data_hash',
  'version',
] as const

/** Present on log_entries but not on client LogEntry. */
export const LOG_ENTRIES_DB_ONLY_COLUMNS = ['user_id', 'fcv_flight_id'] as const

export const LOG_ENTRY_SERVER_OWNED_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
  'dataHash',
  'version',
] as const

/**
 * Copy tags from a log_entries Supabase row (snake_case) onto a client LogEntry shape.
 * Used after inline save .select() so tags are not dropped from UI / IndexedDB.
 */
export function logEntryTagsFromSupabaseRow(row: { tags?: unknown }): string[] {
  return Array.isArray(row.tags) ? [...row.tags] : []
}

export type LogEntrySupabaseRow = Record<string, unknown>

/**
 * Canonical LogEntry → log_entries insert/update payload (snake_case).
 * Omits server-owned timestamps/hash/version and fcv_flight_id.
 */
export function logEntryToSupabaseRow(
  entry: LogEntry,
  userId: string,
  options?: { signaturePending?: boolean; pendingInstructorId?: string | null }
): Record<string, unknown> {
  const signaturePending =
    options?.signaturePending !== undefined
      ? options.signaturePending
      : entry.signaturePending === true
  const pendingInstructorId =
    options?.pendingInstructorId !== undefined
      ? options.pendingInstructorId
      : (entry.pendingInstructorId ?? null)

  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    role: entry.role,
    aircraft_category_class: entry.aircraftCategoryClass,
    category_class_time: entry.categoryClassTime,
    aircraft_make_model: entry.aircraftMakeModel,
    registration: entry.registration,
    flight_number: entry.flightNumber,
    departure: entry.departure,
    destination: entry.destination,
    route: entry.route || '',
    training_elements: entry.trainingElements || null,
    training_instructor: entry.trainingInstructor || null,
    instructor_certificate: entry.instructorCertificate || null,
    pic_name: (entry.picName || '').trim() || null,
    sic_name: (entry.sicName || '').trim() || null,
    flight_conditions: entry.flightConditions,
    remarks: entry.remarks || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    logbook_type: entry.logbookType ?? 'flight',
    flight_time: entry.flightTime,
    performance: entry.performance,
    oooi: entry.oooi || null,
    flagged: entry.flagged ?? false,
    signature_pending: signaturePending,
    pending_instructor_id: pendingInstructorId,
    amends_entry_id: entry.amendsEntryId ?? null,
    is_void: entry.isVoid === true,
    is_imported: entry.isImported ?? false,
    import_source: entry.importSource ?? null,
    import_batch_id: entry.importBatchId ?? null,
    original_entry_date: entry.originalEntryDate ?? null,
    import_metadata: entry.importMetadata ?? null,
  }
}

/**
 * Canonical log_entries row → LogEntry (snake_case → camelCase).
 * Does not apply dashboard display normalization (flight-time number fill).
 */
export function mapSupabaseRowToLogEntry(dbEntry: LogEntrySupabaseRow | Record<string, any>): LogEntry {
  return {
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
    flightConditions: sanitizeFlightConditions(dbEntry.flight_conditions || []),
    remarks: dbEntry.remarks || '',
    tags: logEntryTagsFromSupabaseRow(dbEntry),
    logbookType: dbEntry.logbook_type === 'simulator' ? 'simulator' : 'flight',
    flightTime: dbEntry.flight_time as FlightTimeBreakdown,
    performance: dbEntry.performance as PerformanceMetrics,
    oooi: dbEntry.oooi as OOOITimes | undefined,
    flagged: dbEntry.flagged || false,
    version: dbEntry.version,
    dataHash: dbEntry.data_hash || undefined,
    createdAt: dbEntry.created_at || undefined,
    updatedAt: dbEntry.updated_at || undefined,
    signaturePending: dbEntry.signature_pending === true,
    pendingInstructorId: dbEntry.pending_instructor_id ?? null,
    amendsEntryId: dbEntry.amends_entry_id ?? null,
    isVoid: dbEntry.is_void === true,
    importedSignatureDisplay: null,
    isImported: dbEntry.is_imported || false,
    importSource: dbEntry.import_source || undefined,
    importBatchId: dbEntry.import_batch_id || undefined,
    originalEntryDate: dbEntry.original_entry_date || undefined,
    importMetadata: dbEntry.import_metadata || undefined,
  }
}
