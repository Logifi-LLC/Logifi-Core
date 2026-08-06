import type { LogEntry } from './logbookTypes'

const DB_NAME = 'logifi-logbook'
const DB_VERSION = 2

export const METADATA_ACTIVE_USER_ID = 'activeUserId'
export const METADATA_LAST_ACTIVE_USER_ID = 'lastActiveUserId'

export interface IDBLogEntry extends LogEntry {
  _localId?: string
  _synced: boolean
  _syncTimestamp?: number
  _userId?: string
}

export interface SyncQueueEntry {
  id: string
  operation: 'insert' | 'update' | 'delete'
  entryId: string
  entryData: any
  timestamp: number
  retryCount: number
  lastError?: string
  userId?: string
}

interface IDBMetadata {
  key: string
  value: any
}

let dbInstance: IDBDatabase | null = null
let initPromise: Promise<IDBDatabase> | null = null

function stripInternalEntryFields(entry: IDBLogEntry): LogEntry {
  const { _synced, _syncTimestamp, _localId, _userId, ...rest } = entry
  return rest as LogEntry
}

function ensureUserIndex(store: IDBObjectStore): void {
  if (!store.indexNames.contains('userId')) {
    store.createIndex('userId', '_userId', { unique: false })
  }
}

function ensureQueueUserIndex(store: IDBObjectStore): void {
  if (!store.indexNames.contains('userId')) {
    store.createIndex('userId', 'userId', { unique: false })
  }
}

/**
 * Initialize IndexedDB database
 */
export function initIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
      initPromise = null
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      if (!db.objectStoreNames.contains('log_entries')) {
        const entriesStore = db.createObjectStore('log_entries', { keyPath: 'id' })
        entriesStore.createIndex('date', 'date', { unique: false })
        entriesStore.createIndex('synced', '_synced', { unique: false })
        entriesStore.createIndex('syncTimestamp', '_syncTimestamp', { unique: false })
        entriesStore.createIndex('userId', '_userId', { unique: false })
      } else if (oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction
        if (tx) {
          ensureUserIndex(tx.objectStore('log_entries'))
        }
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
        queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        queueStore.createIndex('retryCount', 'retryCount', { unique: false })
        queueStore.createIndex('userId', 'userId', { unique: false })
      } else if (oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction
        if (tx) {
          ensureQueueUserIndex(tx.objectStore('sync_queue'))
        }
      }

      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    }
  })

  return initPromise
}

/**
 * Get database instance (ensure initialized)
 */
async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    await initIndexedDB()
  }
  if (!dbInstance) {
    throw new Error('Failed to initialize IndexedDB')
  }
  return dbInstance
}

/** Plain copy of entry so IndexedDB structured clone does not fail on Vue reactive arrays. */
function plainEntryForIDB(
  entry: LogEntry,
  syncFields: { _synced: boolean; _syncTimestamp: number; _userId?: string }
): IDBLogEntry {
  const plain = JSON.parse(JSON.stringify(entry)) as LogEntry
  return { ...plain, ...syncFields }
}

async function putEntryInIndexedDB(
  entry: LogEntry,
  syncFields: { _synced: boolean; _syncTimestamp: number; _userId?: string }
): Promise<void> {
  const db = await getDB()
  const existing = await getEntryFromIndexedDB(entry.id)
  const entryWithSync = plainEntryForIDB(entry, {
    ...syncFields,
    _userId: syncFields._userId ?? existing?._userId,
  })

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readwrite')
    const store = transaction.objectStore('log_entries')
    const request = store.put(entryWithSync)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to save entry: ${request.error?.message}`))
  })
}

/**
 * Save log entry to IndexedDB
 */
export async function saveEntryToIndexedDB(entry: LogEntry, userId: string): Promise<void> {
  return putEntryInIndexedDB(entry, { _synced: false, _syncTimestamp: Date.now(), _userId: userId })
}

/**
 * Save synced log entry to IndexedDB
 */
export async function saveSyncedEntryToIndexedDB(entry: LogEntry, userId: string): Promise<void> {
  return putEntryInIndexedDB(entry, { _synced: true, _syncTimestamp: Date.now(), _userId: userId })
}

/**
 * Update log entry in IndexedDB
 */
export async function updateEntryInIndexedDB(
  entry: LogEntry,
  options?: { synced?: boolean; syncTimestamp?: number; userId?: string }
): Promise<void> {
  const existing = await getEntryFromIndexedDB(entry.id)
  return putEntryInIndexedDB(entry, {
    _synced: options?.synced ?? existing?._synced ?? false,
    _syncTimestamp: options?.syncTimestamp ?? existing?._syncTimestamp ?? Date.now(),
    _userId: options?.userId ?? existing?._userId,
  })
}

/**
 * Delete log entry from IndexedDB
 */
export async function deleteEntryFromIndexedDB(entryId: string): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readwrite')
    const store = transaction.objectStore('log_entries')
    const request = store.delete(entryId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to delete entry: ${request.error?.message}`))
  })
}

/**
 * Get entry from IndexedDB
 */
export async function getEntryFromIndexedDB(entryId: string): Promise<IDBLogEntry | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readonly')
    const store = transaction.objectStore('log_entries')
    const request = store.get(entryId)

    request.onsuccess = () => {
      resolve(request.result || null)
    }
    request.onerror = () => reject(new Error(`Failed to get entry: ${request.error?.message}`))
  })
}

/**
 * Get all entries from IndexedDB for a specific user
 */
export async function getAllEntriesFromIndexedDB(userId: string): Promise<LogEntry[]> {
  const entries = await getAllIDBLogEntriesForUser(userId)
  return entries.map(stripInternalEntryFields)
}

/**
 * Get all IndexedDB entries for a user including sync metadata.
 */
export async function getAllIDBLogEntriesForUser(userId: string): Promise<IDBLogEntry[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readonly')
    const store = transaction.objectStore('log_entries')
    const request = store.getAll()

    request.onsuccess = () => {
      const entries: IDBLogEntry[] = request.result || []
      resolve(entries.filter((entry) => entry._userId === userId))
    }
    request.onerror = () => reject(new Error(`Failed to get entries: ${request.error?.message}`))
  })
}

/**
 * Mark entry as synced
 */
export async function markEntryAsSynced(entryId: string): Promise<void> {
  const db = await getDB()
  const entry = await getEntryFromIndexedDB(entryId)

  if (!entry) {
    return
  }

  const updated: IDBLogEntry = {
    ...entry,
    _synced: true,
    _syncTimestamp: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readwrite')
    const store = transaction.objectStore('log_entries')
    const request = store.put(updated)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to mark entry as synced: ${request.error?.message}`))
  })
}

/**
 * Get unsynced entries for a specific user
 */
export async function getUnsyncedEntries(userId: string): Promise<IDBLogEntry[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readonly')
    const store = transaction.objectStore('log_entries')
    const index = store.index('synced')
    const request = index.getAll(false)

    request.onsuccess = () => {
      const entries: IDBLogEntry[] = request.result || []
      resolve(entries.filter((entry) => entry._userId === userId))
    }
    request.onerror = () => reject(new Error(`Failed to get unsynced entries: ${request.error?.message}`))
  })
}

// Sync Queue Operations

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(
  operation: 'insert' | 'update' | 'delete',
  entryId: string,
  userId: string,
  entryData?: any
): Promise<string> {
  const db = await getDB()
  const plainEntryData = entryData != null ? JSON.parse(JSON.stringify(entryData)) : null
  const queueEntry: SyncQueueEntry = {
    id: crypto.randomUUID(),
    operation,
    entryId,
    entryData: plainEntryData,
    timestamp: Date.now(),
    retryCount: 0,
    userId,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    const request = store.add(queueEntry)

    request.onsuccess = () => resolve(queueEntry.id)
    request.onerror = () => reject(new Error(`Failed to add to sync queue: ${request.error?.message}`))
  })
}

/**
 * Get sync queue entries, optionally filtered by user
 */
export async function getSyncQueue(userId?: string): Promise<SyncQueueEntry[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readonly')
    const store = transaction.objectStore('sync_queue')
    const index = store.index('timestamp')
    const request = index.getAll()

    request.onsuccess = () => {
      let items: SyncQueueEntry[] = request.result || []
      if (userId) {
        items = items.filter((item) => item.userId === userId)
      }
      resolve(items)
    }
    request.onerror = () => reject(new Error(`Failed to get sync queue: ${request.error?.message}`))
  })
}

/**
 * Remove all queued operations for a specific entry id (optionally scoped to user).
 */
export async function removeQueuedOperationsForEntry(entryId: string, userId?: string): Promise<number> {
  const queue = await getSyncQueue(userId)
  const matches = queue.filter((item) => item.entryId === entryId)
  await Promise.all(matches.map((item) => removeFromSyncQueue(item.id)))
  return matches.length
}

/**
 * Remove entry from sync queue
 */
export async function removeFromSyncQueue(queueId: string): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    const request = store.delete(queueId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to remove from sync queue: ${request.error?.message}`))
  })
}

/**
 * Update sync queue entry (for retry count, errors, etc.)
 */
export async function updateSyncQueueEntry(queueId: string, updates: Partial<SyncQueueEntry>): Promise<void> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    const getRequest = store.get(queueId)

    getRequest.onsuccess = () => {
      const entry = getRequest.result
      if (!entry) {
        reject(new Error(`Queue entry ${queueId} not found`))
        return
      }

      const updated = { ...entry, ...updates }
      const putRequest = store.put(updated)

      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(new Error(`Failed to update sync queue entry: ${putRequest.error?.message}`))
    }

    getRequest.onerror = () => reject(new Error(`Failed to get sync queue entry: ${getRequest.error?.message}`))
  })
}

/**
 * Get sync queue length for a user
 */
export async function getSyncQueueLength(userId?: string): Promise<number> {
  const queue = await getSyncQueue(userId)
  return queue.length
}

// Metadata Operations

/**
 * Get metadata value
 */
export async function getMetadata(key: string): Promise<any> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['metadata'], 'readonly')
    const store = transaction.objectStore('metadata')
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result?.value ?? null)
    }
    request.onerror = () => reject(new Error(`Failed to get metadata: ${request.error?.message}`))
  })
}

/**
 * Set metadata value
 */
export async function setMetadata(key: string, value: any): Promise<void> {
  const db = await getDB()
  const metadata: IDBMetadata = { key, value }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['metadata'], 'readwrite')
    const store = transaction.objectStore('metadata')
    const request = store.put(metadata)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to set metadata: ${request.error?.message}`))
  })
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTimestamp(): Promise<number | null> {
  return getMetadata('lastSyncTimestamp')
}

/**
 * Set last sync timestamp
 */
export async function setLastSyncTimestamp(timestamp: number): Promise<void> {
  return setMetadata('lastSyncTimestamp', timestamp)
}

export const METADATA_LAST_SUCCESSFUL_REMOTE_SYNC = 'lastSuccessfulRemoteSyncAt'
export const METADATA_REMOTE_SYNC_WATERMARK = 'remoteSyncWatermark'

export async function getLastSuccessfulRemoteSyncAt(): Promise<number | null> {
  return getMetadata(METADATA_LAST_SUCCESSFUL_REMOTE_SYNC)
}

export async function setLastSuccessfulRemoteSyncAt(timestamp: number): Promise<void> {
  return setMetadata(METADATA_LAST_SUCCESSFUL_REMOTE_SYNC, timestamp)
}

/** Max server `updated_at` (or tombstone `deleted_at`) from the last successful inbound sync. */
export async function getRemoteSyncWatermark(): Promise<string | null> {
  const value = await getMetadata(METADATA_REMOTE_SYNC_WATERMARK)
  return typeof value === 'string' && value.length > 0 ? value : null
}

export async function setRemoteSyncWatermark(iso: string): Promise<void> {
  return setMetadata(METADATA_REMOTE_SYNC_WATERMARK, iso)
}

/**
 * Assign legacy unscoped IndexedDB rows to the current user when safe.
 * Unscoped rows are quarantined when a different user logs in.
 */
export async function migrateLegacyLocalData(currentUserId: string): Promise<void> {
  await initIndexedDB()
  const db = await getDB()
  const lastActiveUserId = (await getMetadata(METADATA_LAST_ACTIVE_USER_ID)) as string | null
  const canClaimLegacy = lastActiveUserId == null || lastActiveUserId === currentUserId

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['log_entries', 'sync_queue', 'metadata'], 'readwrite')
    const entriesStore = transaction.objectStore('log_entries')
    const queueStore = transaction.objectStore('sync_queue')
    const metadataStore = transaction.objectStore('metadata')

    const entriesRequest = entriesStore.getAll()
    entriesRequest.onsuccess = () => {
      const entries: IDBLogEntry[] = entriesRequest.result || []
      for (const entry of entries) {
        if (!entry._userId && canClaimLegacy) {
          entriesStore.put({ ...entry, _userId: currentUserId })
        }
      }
    }
    entriesRequest.onerror = () => reject(new Error('Failed to migrate legacy entries'))

    const queueRequest = queueStore.getAll()
    queueRequest.onsuccess = () => {
      const items: SyncQueueEntry[] = queueRequest.result || []
      for (const item of items) {
        if (!item.userId && canClaimLegacy) {
          queueStore.put({ ...item, userId: currentUserId })
        }
      }
    }
    queueRequest.onerror = () => reject(new Error('Failed to migrate legacy sync queue'))

    metadataStore.put({ key: METADATA_ACTIVE_USER_ID, value: currentUserId })
    metadataStore.put({ key: METADATA_LAST_ACTIVE_USER_ID, value: currentUserId })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Legacy local data migration failed'))
  })
}

export async function getActiveUserId(): Promise<string | null> {
  return (await getMetadata(METADATA_ACTIVE_USER_ID)) as string | null
}

/**
 * Remove all IndexedDB log entries and sync-queue rows for a user (account deletion).
 */
export async function clearAllDataForUser(userId: string): Promise<void> {
  const entries = await getAllIDBLogEntriesForUser(userId)
  for (const entry of entries) {
    await deleteEntryFromIndexedDB(entry.id)
  }

  const queue = await getSyncQueue(userId)
  for (const item of queue) {
    await removeFromSyncQueue(item.id)
  }

  const active = await getActiveUserId()
  if (active === userId) {
    await setMetadata(METADATA_ACTIVE_USER_ID, null)
  }
}
