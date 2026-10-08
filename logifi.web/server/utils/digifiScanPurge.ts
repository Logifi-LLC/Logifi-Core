import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database'

/** Private bucket written by POST /api/digifi/scan. */
export const DIGIFI_SCANS_BUCKET = 'digifi-scans'

/** Storage remove accepts batches; keep each request small and retryable. */
export const DIGIFI_SCAN_PURGE_BATCH_SIZE = 100

/** Cap one invocation so a daily cron finishes and the next day continues. */
export const DIGIFI_SCAN_PURGE_MAX_BATCHES = 20

/**
 * scan.post.ts stores `{userId}/{scanId}.{jpg|png|webp}`.
 * Anything else is left in place so a bad row cannot point the purge at another object.
 */
const DIGIFI_SCAN_STORAGE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

export interface DigifiScanExpiryRow {
  id: string
  storage_path: string
  expires_at: string
}

export interface DigifiScanStorageRemoveError {
  message: string
  status?: number | string
  statusCode?: number | string
}

export interface DigifiScanPurgeResult {
  ok: boolean
  sessionsSelected: number
  storageRemoved: number
  storageAlreadyGone: number
  sessionsDeleted: number
  skippedUnexpectedPath: number
  batches: number
  truncated: boolean
  stoppedReason: 'complete' | 'storage_error' | 'delete_error' | 'list_error' | null
}

export interface DigifiScanSessionSource {
  listExpired(input: {
    nowIso: string
    limit: number
    afterId: string | null
  }): Promise<{ rows: DigifiScanExpiryRow[]; error: string | null }>
  removeStorage(paths: string[]): Promise<{
    removed: number
    error: DigifiScanStorageRemoveError | null
  }>
  deleteSessions(ids: string[]): Promise<{ error: string | null }>
}

/** True when `expires_at` is a real timestamp at or before `now`. Unparseable values are kept. */
export function isDigifiScanExpired(expiresAt: string, now: Date): boolean {
  const expiresMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresMs)) return false
  return expiresMs <= now.getTime()
}

export function selectExpiredDigifiScans<T extends { expires_at: string }>(
  rows: readonly T[],
  now: Date
): T[] {
  return rows.filter((row) => isDigifiScanExpired(row.expires_at, now))
}

export function isDigifiScanStoragePath(path: string): boolean {
  return DIGIFI_SCAN_STORAGE_PATH.test(path)
}

/** Missing objects are success: a previous run may have removed the file already. */
export function isStorageObjectAlreadyGone(
  error: DigifiScanStorageRemoveError | null | undefined
): boolean {
  if (!error) return false
  const status = Number(error.statusCode ?? error.status)
  if (status === 404) return true
  const message = error.message.toLowerCase()
  return message.includes('not found') || message.includes('not_found') || message.includes('nosuchkey')
}

export function createSupabaseDigifiScanSessionSource(
  service: SupabaseClient<Database>
): DigifiScanSessionSource {
  return {
    async listExpired(input) {
      const base = service
        .from('digifi_scan_sessions')
        .select('id, storage_path, expires_at')
        .lte('expires_at', input.nowIso)
        .order('id', { ascending: true })
        .limit(input.limit)

      const { data, error } = input.afterId ? await base.gt('id', input.afterId) : await base
      if (error) return { rows: [], error: error.message }
      const rows = (data ?? []) as DigifiScanExpiryRow[]
      return {
        rows: rows.map((row) => ({
          id: row.id,
          storage_path: row.storage_path,
          expires_at: row.expires_at,
        })),
        error: null,
      }
    },

    async removeStorage(paths) {
      if (paths.length === 0) return { removed: 0, error: null }
      const { data, error } = await service.storage.from(DIGIFI_SCANS_BUCKET).remove(paths)
      if (error) {
        const storageError = error as DigifiScanStorageRemoveError
        return {
          removed: 0,
          error: {
            message: storageError.message,
            status: storageError.status,
            statusCode: storageError.statusCode,
          },
        }
      }
      return { removed: data?.length ?? paths.length, error: null }
    },

    async deleteSessions(ids) {
      if (ids.length === 0) return { error: null }
      const { error } = await service.from('digifi_scan_sessions').delete().in('id', ids)
      return { error: error ? error.message : null }
    },
  }
}

/**
 * Delete expired Digifi scan images, then their session rows.
 * Storage is removed first so a failed delete retries next run instead of orphaning the file.
 * Rows whose path is not a scan object are skipped and do not block later rows.
 */
export async function purgeExpiredDigifiScans(
  source: DigifiScanSessionSource,
  options?: {
    now?: Date
    batchSize?: number
    maxBatches?: number
  }
): Promise<DigifiScanPurgeResult> {
  const now = options?.now ?? new Date()
  const nowIso = now.toISOString()
  const batchSize = options?.batchSize ?? DIGIFI_SCAN_PURGE_BATCH_SIZE
  const maxBatches = options?.maxBatches ?? DIGIFI_SCAN_PURGE_MAX_BATCHES

  const result: DigifiScanPurgeResult = {
    ok: true,
    sessionsSelected: 0,
    storageRemoved: 0,
    storageAlreadyGone: 0,
    sessionsDeleted: 0,
    skippedUnexpectedPath: 0,
    batches: 0,
    truncated: false,
    stoppedReason: null,
  }

  let afterId: string | null = null

  for (let batch = 0; batch < maxBatches; batch++) {
    const listed = await source.listExpired({ nowIso, limit: batchSize, afterId })
    if (listed.error) {
      console.error('[digifi-scan-purge] list failed:', listed.error)
      result.ok = false
      result.stoppedReason = 'list_error'
      return result
    }

    if (listed.rows.length === 0) {
      result.stoppedReason = 'complete'
      return result
    }

    result.batches += 1
    afterId = listed.rows[listed.rows.length - 1]?.id ?? afterId

    const expired = selectExpiredDigifiScans(listed.rows, now)
    const eligible = expired.filter((row) => isDigifiScanStoragePath(row.storage_path))
    result.skippedUnexpectedPath += expired.length - eligible.length
    result.sessionsSelected += eligible.length

    if (eligible.length > 0) {
      const paths = [...new Set(eligible.map((row) => row.storage_path))]
      const removed = await source.removeStorage(paths)
      if (removed.error) {
        if (!isStorageObjectAlreadyGone(removed.error)) {
          console.error('[digifi-scan-purge] storage remove failed:', removed.error.message)
          result.ok = false
          result.stoppedReason = 'storage_error'
          return result
        }
        result.storageAlreadyGone += paths.length
      } else {
        result.storageRemoved += removed.removed
        const missing = paths.length - removed.removed
        if (missing > 0) result.storageAlreadyGone += missing
      }

      const deleted = await source.deleteSessions(eligible.map((row) => row.id))
      if (deleted.error) {
        console.error('[digifi-scan-purge] session delete failed:', deleted.error)
        result.ok = false
        result.stoppedReason = 'delete_error'
        return result
      }
      result.sessionsDeleted += eligible.length
    }

    if (listed.rows.length < batchSize) {
      result.stoppedReason = 'complete'
      return result
    }
  }

  result.truncated = true
  result.stoppedReason = 'complete'
  return result
}
