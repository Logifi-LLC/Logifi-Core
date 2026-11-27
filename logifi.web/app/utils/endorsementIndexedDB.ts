import type { Database } from '~/types/database'
import { getIndexedDBInstance, initIndexedDB } from '~/utils/indexedDB'

export type EndorsementRow = Database['public']['Tables']['endorsements']['Row']

export type IDBEndorsementRow = EndorsementRow & {
  _synced: boolean
  _syncTimestamp?: number
  _userId?: string
  _lastSyncError?: string | null
}

export type EndorsementSyncOperation =
  | 'request'
  | 'issue'
  | 'sign'
  | 'cancel'
  | 'import'

export interface EndorsementSyncQueueEntry {
  id: string
  endorsementId: string
  operation: EndorsementSyncOperation
  payload: Record<string, unknown>
  timestamp: number
  retryCount: number
  lastError?: string
  userId: string
}

export const METADATA_ENDORSEMENT_LAST_SYNC = 'endorsementLastRemoteSyncAt'

async function getDB(): Promise<IDBDatabase> {
  await initIndexedDB()
  return getIndexedDBInstance()
}

function stripInternal(row: IDBEndorsementRow): EndorsementRow {
  const { _synced, _syncTimestamp, _userId, _lastSyncError, ...rest } = row
  void _synced
  void _syncTimestamp
  void _userId
  void _lastSyncError
  return rest as EndorsementRow
}

export function toPublicEndorsementRow(row: IDBEndorsementRow): EndorsementRow & {
  _localSyncPending?: boolean
  _localSyncError?: string | null
} {
  const base = stripInternal(row)
  return {
    ...base,
    _localSyncPending: !row._synced,
    _localSyncError: row._lastSyncError ?? null,
  }
}

function plainRow(
  row: EndorsementRow,
  fields: Pick<IDBEndorsementRow, '_synced' | '_syncTimestamp' | '_userId' | '_lastSyncError'>
): IDBEndorsementRow {
  const plain = JSON.parse(JSON.stringify(row)) as EndorsementRow
  return { ...plain, ...fields }
}

export async function saveEndorsementToIndexedDB(
  row: EndorsementRow,
  userId: string,
  synced = false
): Promise<void> {
  const db = await getDB()
  const entry = plainRow(row, {
    _synced: synced,
    _syncTimestamp: Date.now(),
    _userId: userId,
    _lastSyncError: null,
  })
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['endorsements'], 'readwrite')
    const store = tx.objectStore('endorsements')
    const request = store.put(entry)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function updateEndorsementInIndexedDB(
  row: EndorsementRow,
  options: {
    userId: string
    synced?: boolean
    lastSyncError?: string | null
  }
): Promise<void> {
  const existing = await getEndorsementFromIndexedDB(row.id)
  const synced = options.synced ?? existing?._synced ?? false
  const entry = plainRow(row, {
    _synced: synced,
    _syncTimestamp: Date.now(),
    _userId: options.userId ?? existing?._userId,
    _lastSyncError: options.lastSyncError ?? existing?._lastSyncError ?? null,
  })
  const db = await getDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['endorsements'], 'readwrite')
    const request = tx.objectStore('endorsements').put(entry)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getEndorsementFromIndexedDB(id: string): Promise<IDBEndorsementRow | null> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['endorsements'], 'readonly')
    const request = tx.objectStore('endorsements').get(id)
    request.onsuccess = () => resolve((request.result as IDBEndorsementRow) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllEndorsementsForUser(userId: string): Promise<IDBEndorsementRow[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['endorsements'], 'readonly')
    const request = tx.objectStore('endorsements').getAll()
    request.onsuccess = () => {
      const rows = (request.result as IDBEndorsementRow[]) || []
      resolve(rows.filter((r) => r._userId === userId))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteEndorsementFromIndexedDB(id: string): Promise<void> {
  const db = await getDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['endorsements'], 'readwrite')
    const request = tx.objectStore('endorsements').delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function addToEndorsementSyncQueue(
  operation: EndorsementSyncOperation,
  endorsementId: string,
  userId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const db = await getDB()
  const queueEntry: EndorsementSyncQueueEntry = {
    id: crypto.randomUUID(),
    endorsementId,
    operation,
    payload: JSON.parse(JSON.stringify(payload)),
    timestamp: Date.now(),
    retryCount: 0,
    userId,
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['endorsement_sync_queue'], 'readwrite')
    const request = tx.objectStore('endorsement_sync_queue').add(queueEntry)
    request.onsuccess = () => resolve(queueEntry.id)
    request.onerror = () => reject(request.error)
  })
}

export async function getEndorsementSyncQueue(userId?: string): Promise<EndorsementSyncQueueEntry[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['endorsement_sync_queue'], 'readonly')
    const request = tx.objectStore('endorsement_sync_queue').index('timestamp').getAll()
    request.onsuccess = () => {
      let items = (request.result as EndorsementSyncQueueEntry[]) || []
      if (userId) items = items.filter((i) => i.userId === userId)
      resolve(items)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function removeFromEndorsementSyncQueue(queueId: string): Promise<void> {
  const db = await getDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['endorsement_sync_queue'], 'readwrite')
    const request = tx.objectStore('endorsement_sync_queue').delete(queueId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function updateEndorsementSyncQueueEntry(
  queueId: string,
  updates: Partial<EndorsementSyncQueueEntry>
): Promise<void> {
  const db = await getDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['endorsement_sync_queue'], 'readwrite')
    const store = tx.objectStore('endorsement_sync_queue')
    const getReq = store.get(queueId)
    getReq.onsuccess = () => {
      const entry = getReq.result as EndorsementSyncQueueEntry | undefined
      if (!entry) {
        reject(new Error(`Endorsement queue entry ${queueId} not found`))
        return
      }
      const putReq = store.put({ ...entry, ...updates })
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function removeEndorsementQueueOpsForId(
  endorsementId: string,
  userId?: string
): Promise<number> {
  const queue = await getEndorsementSyncQueue(userId)
  const matches = queue.filter((q) => q.endorsementId === endorsementId)
  await Promise.all(matches.map((m) => removeFromEndorsementSyncQueue(m.id)))
  return matches.length
}

export async function getEndorsementSyncQueueLength(userId?: string): Promise<number> {
  const queue = await getEndorsementSyncQueue(userId)
  return queue.length
}

export async function clearEndorsementDataForUser(userId: string): Promise<void> {
  const rows = await getAllEndorsementsForUser(userId)
  for (const row of rows) {
    await deleteEndorsementFromIndexedDB(row.id)
  }
  const queue = await getEndorsementSyncQueue(userId)
  for (const item of queue) {
    await removeFromEndorsementSyncQueue(item.id)
  }
}