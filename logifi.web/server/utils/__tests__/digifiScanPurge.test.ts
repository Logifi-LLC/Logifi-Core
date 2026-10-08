import { describe, expect, it } from 'vitest'
import {
  isDigifiScanExpired,
  isDigifiScanStoragePath,
  isStorageObjectAlreadyGone,
  purgeExpiredDigifiScans,
  selectExpiredDigifiScans,
  type DigifiScanExpiryRow,
  type DigifiScanSessionSource,
} from '../digifiScanPurge'

const NOW = new Date('2026-10-08T12:00:00.000Z')
const PAST = '2026-10-07T12:00:00.000Z'
const FUTURE = '2026-10-09T12:00:00.000Z'

const USER = '11111111-1111-4111-8111-111111111111'
const SCAN_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SCAN_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SCAN_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function row(id: string, expiresAt: string, ext = 'jpg'): DigifiScanExpiryRow {
  return {
    id,
    storage_path: `${USER}/${id}.${ext}`,
    expires_at: expiresAt,
  }
}

function createSource(initial: DigifiScanExpiryRow[], options?: {
  removeError?: { message: string; statusCode?: number } | null
  deleteError?: string | null
  listError?: string | null
  honorExpiry?: boolean
}): {
  source: DigifiScanSessionSource
  removed: string[]
  deleted: string[]
  remaining: () => DigifiScanExpiryRow[]
} {
  const rows = initial.map((item) => ({ ...item }))
  const removed: string[] = []
  const deleted: string[] = []
  const honorExpiry = options?.honorExpiry ?? true

  const source: DigifiScanSessionSource = {
    async listExpired(input) {
      if (options?.listError) return { rows: [], error: options.listError }
      const page = rows
        .filter((item) => !honorExpiry || item.expires_at <= input.nowIso)
        .filter((item) => !input.afterId || item.id > input.afterId)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, input.limit)
        .map((item) => ({ ...item }))
      return { rows: page, error: null }
    },
    async removeStorage(paths) {
      if (options?.removeError) return { removed: 0, error: options.removeError }
      removed.push(...paths)
      return { removed: paths.length, error: null }
    },
    async deleteSessions(ids) {
      if (options?.deleteError) return { error: options.deleteError }
      for (const id of ids) {
        const index = rows.findIndex((item) => item.id === id)
        if (index >= 0) rows.splice(index, 1)
        deleted.push(id)
      }
      return { error: null }
    },
  }

  return { source, removed, deleted, remaining: () => rows.map((item) => ({ ...item })) }
}

describe('selectExpiredDigifiScans', () => {
  it('keeps sessions that have not reached expires_at', () => {
    const rows = [row(SCAN_A, FUTURE), row(SCAN_B, PAST)]
    expect(selectExpiredDigifiScans(rows, NOW).map((item) => item.id)).toEqual([SCAN_B])
  })

  it('treats expires_at equal to now as due', () => {
    const due = row(SCAN_A, NOW.toISOString())
    expect(isDigifiScanExpired(due.expires_at, NOW)).toBe(true)
    expect(selectExpiredDigifiScans([due], NOW)).toEqual([due])
  })

  it('does not select an unparseable expires_at', () => {
    const broken = row(SCAN_A, 'not-a-timestamp')
    expect(isDigifiScanExpired(broken.expires_at, NOW)).toBe(false)
    expect(selectExpiredDigifiScans([broken], NOW)).toEqual([])
  })
})

describe('isDigifiScanStoragePath', () => {
  it('accepts the scan.post.ts object key', () => {
    expect(isDigifiScanStoragePath(`${USER}/${SCAN_A}.jpg`)).toBe(true)
    expect(isDigifiScanStoragePath(`${USER}/${SCAN_A}.png`)).toBe(true)
    expect(isDigifiScanStoragePath(`${USER}/${SCAN_A}.webp`)).toBe(true)
  })

  it('rejects other buckets, traversal, and unexpected extensions', () => {
    expect(isDigifiScanStoragePath(`${USER}/${SCAN_A}.jpeg`)).toBe(false)
    expect(isDigifiScanStoragePath(`../flight-signatures/${SCAN_A}.jpg`)).toBe(false)
    expect(isDigifiScanStoragePath(`${USER}/notes.txt`)).toBe(false)
    expect(isDigifiScanStoragePath('')).toBe(false)
  })
})

describe('isStorageObjectAlreadyGone', () => {
  it('treats 404 and not-found messages as already deleted', () => {
    expect(isStorageObjectAlreadyGone({ message: 'Object not found', statusCode: 404 })).toBe(true)
    expect(isStorageObjectAlreadyGone({ message: 'Not Found', status: '404' })).toBe(true)
    expect(isStorageObjectAlreadyGone({ message: 'NoSuchKey' })).toBe(true)
  })

  it('does not treat other storage failures as missing objects', () => {
    expect(isStorageObjectAlreadyGone({ message: 'Internal server error', statusCode: 500 })).toBe(false)
    expect(isStorageObjectAlreadyGone(null)).toBe(false)
  })
})

describe('purgeExpiredDigifiScans', () => {
  it('removes expired objects and then their session rows', async () => {
    const { source, removed, deleted, remaining } = createSource([
      row(SCAN_A, PAST),
      row(SCAN_B, FUTURE),
    ])

    const result = await purgeExpiredDigifiScans(source, { now: NOW, batchSize: 10 })

    expect(result.ok).toBe(true)
    expect(result.sessionsSelected).toBe(1)
    expect(result.sessionsDeleted).toBe(1)
    expect(result.storageRemoved).toBe(1)
    expect(removed).toEqual([`${USER}/${SCAN_A}.jpg`])
    expect(deleted).toEqual([SCAN_A])
    expect(remaining().map((item) => item.id)).toEqual([SCAN_B])
  })

  it('is a no-op when the same purge runs again', async () => {
    const { source, removed, remaining } = createSource([row(SCAN_A, PAST)])

    await purgeExpiredDigifiScans(source, { now: NOW })
    const second = await purgeExpiredDigifiScans(source, { now: NOW })

    expect(second).toMatchObject({
      ok: true,
      sessionsSelected: 0,
      sessionsDeleted: 0,
      storageRemoved: 0,
      stoppedReason: 'complete',
    })
    expect(removed).toHaveLength(1)
    expect(remaining()).toEqual([])
  })

  it('deletes the session row when the storage object is already gone', async () => {
    const { source, deleted, remaining } = createSource([row(SCAN_A, PAST)], {
      removeError: { message: 'Object not found', statusCode: 404 },
    })

    const result = await purgeExpiredDigifiScans(source, { now: NOW })

    expect(result.ok).toBe(true)
    expect(result.storageAlreadyGone).toBe(1)
    expect(result.sessionsDeleted).toBe(1)
    expect(deleted).toEqual([SCAN_A])
    expect(remaining()).toEqual([])
  })

  it('leaves the session row when storage removal fails', async () => {
    const { source, deleted, remaining } = createSource([row(SCAN_A, PAST)], {
      removeError: { message: 'Internal server error', statusCode: 500 },
    })

    const result = await purgeExpiredDigifiScans(source, { now: NOW })

    expect(result.ok).toBe(false)
    expect(result.stoppedReason).toBe('storage_error')
    expect(result.sessionsDeleted).toBe(0)
    expect(deleted).toEqual([])
    expect(remaining()).toHaveLength(1)
  })

  it('does not delete a row the query returned that is still inside the retention window', async () => {
    const { source, removed, deleted } = createSource([row(SCAN_A, FUTURE)], { honorExpiry: false })

    const result = await purgeExpiredDigifiScans(source, { now: NOW })

    expect(result.sessionsSelected).toBe(0)
    expect(result.sessionsDeleted).toBe(0)
    expect(removed).toEqual([])
    expect(deleted).toEqual([])
  })

  it('skips an unexpected storage path and still purges later expired scans', async () => {
    const unexpected: DigifiScanExpiryRow = {
      id: SCAN_A,
      storage_path: `${USER}/notes.txt`,
      expires_at: PAST,
    }
    const { source, removed, deleted, remaining } = createSource([
      unexpected,
      row(SCAN_B, PAST, 'png'),
    ], { honorExpiry: true })

    const result = await purgeExpiredDigifiScans(source, { now: NOW, batchSize: 1 })

    expect(result.ok).toBe(true)
    expect(result.skippedUnexpectedPath).toBe(1)
    expect(removed).toEqual([`${USER}/${SCAN_B}.png`])
    expect(deleted).toEqual([SCAN_B])
    expect(remaining().map((item) => item.id)).toEqual([SCAN_A])
  })

  it('pages through expired rows in id order', async () => {
    const { source, deleted } = createSource([
      row(SCAN_C, PAST),
      row(SCAN_A, PAST),
      row(SCAN_B, PAST, 'webp'),
    ])

    const result = await purgeExpiredDigifiScans(source, { now: NOW, batchSize: 2, maxBatches: 5 })

    expect(result.ok).toBe(true)
    expect(result.batches).toBe(2)
    expect(result.truncated).toBe(false)
    expect(deleted).toEqual([SCAN_A, SCAN_B, SCAN_C])
  })

  it('stops without deleting rows when the session delete fails', async () => {
    const { source, removed, remaining } = createSource([row(SCAN_A, PAST)], {
      deleteError: 'rls',
    })

    const result = await purgeExpiredDigifiScans(source, { now: NOW })

    expect(result.ok).toBe(false)
    expect(result.stoppedReason).toBe('delete_error')
    expect(result.storageRemoved).toBe(1)
    expect(removed).toHaveLength(1)
    expect(remaining()).toHaveLength(1)
  })

  it('reports a list failure and deletes nothing', async () => {
    const { source, removed, deleted } = createSource([row(SCAN_A, PAST)], {
      listError: 'timeout',
    })

    const result = await purgeExpiredDigifiScans(source, { now: NOW })

    expect(result.ok).toBe(false)
    expect(result.stoppedReason).toBe('list_error')
    expect(removed).toEqual([])
    expect(deleted).toEqual([])
  })
})
