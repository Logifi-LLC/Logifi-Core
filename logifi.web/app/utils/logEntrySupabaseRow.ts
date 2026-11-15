/**
 * Copy tags from a log_entries Supabase row (snake_case) onto a client LogEntry shape.
 * Used after inline save .select() so tags are not dropped from UI / IndexedDB.
 */
export function logEntryTagsFromSupabaseRow(row: { tags?: unknown }): string[] {
  return Array.isArray(row.tags) ? [...row.tags] : []
}