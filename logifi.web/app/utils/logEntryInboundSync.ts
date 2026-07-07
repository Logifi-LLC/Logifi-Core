import { supabase } from '~/lib/supabase'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  DELTA_OVERLAP_MS,
  subtractOverlapFromIso,
  type LogEntryDeletionTombstone,
} from '../../shared/logEntrySync'

const DELTA_BATCH_SIZE = 1000

export type MapSupabaseRowFn = (row: Record<string, unknown>) => LogEntry

export async function insertLogEntryTombstone(userId: string, entryId: string): Promise<void> {
  const { error } = await (supabase.from('log_entry_deletions') as any).upsert(
    {
      user_id: userId,
      entry_id: entryId,
      deleted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,entry_id' }
  )

  if (error) {
    console.warn('[LogEntryInboundSync] Failed to insert tombstone:', error.message)
  }
}

export async function fetchDeltaLogEntries(
  userId: string,
  watermarkIso: string,
  mapRow: MapSupabaseRowFn
): Promise<LogEntry[]> {
  const sinceIso = subtractOverlapFromIso(watermarkIso, DELTA_OVERLAP_MS)
  const allEntries: LogEntry[] = []
  let from = 0

  while (true) {
    const to = from + DELTA_BATCH_SIZE - 1
    const { data: batch, error } = await (supabase.from('log_entries') as any)
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', sinceIso)
      .order('updated_at', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('[LogEntryInboundSync] Delta entry fetch failed:', error)
      throw error
    }

    if (!batch?.length) break
    allEntries.push(...batch.map((row: Record<string, unknown>) => mapRow(row)))
    if (batch.length < DELTA_BATCH_SIZE) break
    from += DELTA_BATCH_SIZE
  }

  return allEntries
}

export async function fetchDeltaDeletions(
  userId: string,
  watermarkIso: string
): Promise<LogEntryDeletionTombstone[]> {
  const sinceIso = subtractOverlapFromIso(watermarkIso, DELTA_OVERLAP_MS)
  const allTombstones: LogEntryDeletionTombstone[] = []
  let from = 0

  while (true) {
    const to = from + DELTA_BATCH_SIZE - 1
    const { data: batch, error } = await (supabase.from('log_entry_deletions') as any)
      .select('entry_id, deleted_at')
      .eq('user_id', userId)
      .gt('deleted_at', sinceIso)
      .order('deleted_at', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('[LogEntryInboundSync] Delta deletion fetch failed:', error)
      throw error
    }

    if (!batch?.length) break
    allTombstones.push(
      ...batch.map((row: { entry_id: string; deleted_at: string }) => ({
        entryId: row.entry_id,
        deletedAt: row.deleted_at,
      }))
    )
    if (batch.length < DELTA_BATCH_SIZE) break
    from += DELTA_BATCH_SIZE
  }

  return allTombstones
}
