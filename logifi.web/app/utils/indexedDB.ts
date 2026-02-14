import type { LogEntry } from './logbookTypes'

const DB_NAME = 'logifi-logbook'
const DB_VERSION = 1

export interface IDBLogEntry extends LogEntry {
  _localId?: string  // Temporary ID for unsynced entries
  _synced: boolean
  _syncTimestamp?: number
}

export interface SyncQueueEntry {
  id: string
  operation: 'insert' | 'update' | 'delete'
  entryId: string
  entryData: any
  timestamp: number
  retryCount: number
  lastError?: string
}

interface IDBMetadata {
  key: string
  value: any
}

let dbInstance: IDBDatabase | null = null
let initPromise: Promise<IDBDatabase> | null = null

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

      // Create log_entries store
      if (!db.objectStoreNames.contains('log_entries')) {
        const entriesStore = db.createObjectStore('log_entries', { keyPath: 'id' })
        entriesStore.createIndex('date', 'date', { unique: false })
        entriesStore.createIndex('synced', '_synced', { unique: false })
        entriesStore.createIndex('syncTimestamp', '_syncTimestamp', { unique: false })
      }

      // Create sync_queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
        queueStore.createIndex('timestamp', 'timestamp', { unique: false })
        queueStore.createIndex('retryCount', 'retryCount', { unique: false })
      }

      // Create metadata store
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

/**
 * Save log entry to IndexedDB
 */
export async function saveEntryToIndexedDB(entry: LogEntry): Promise<void> {
  const db = await getDB()
  const entryWithSync: IDBLogEntry = {
    ...entry,
    _synced: false,
    _syncTimestamp: Date.now()
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readwrite')
    const store = transaction.objectStore('log_entries')
    const request = store.put(entryWithSync)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to save entry: ${request.error?.message}`))
  })
}

/**
 * Update log entry in IndexedDB
 */
export async function updateEntryInIndexedDB(entry: LogEntry): Promise<void> {
  const db = await getDB()
  
  // Get existing entry to preserve sync status
  const existing = await getEntryFromIndexedDB(entry.id)
  const entryWithSync: IDBLogEntry = {
    ...entry,
    _synced: existing?._synced ?? false,
    _syncTimestamp: existing?._syncTimestamp ?? Date.now()
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readwrite')
    const store = transaction.objectStore('log_entries')
    const request = store.put(entryWithSync)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to update entry: ${request.error?.message}`))
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
 * Get all entries from IndexedDB
 */
export async function getAllEntriesFromIndexedDB(): Promise<LogEntry[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readonly')
    const store = transaction.objectStore('log_entries')
    const request = store.getAll()

    request.onsuccess = () => {
      const entries = request.result || []
      // Remove internal sync fields before returning
      const cleaned = entries.map(({ _synced, _syncTimestamp, _localId, ...entry }) => entry as LogEntry)
      resolve(cleaned)
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
    return // Entry no longer in IndexedDB (e.g. deleted after queue); nothing to mark
  }

  const updated: IDBLogEntry = {
    ...entry,
    _synced: true,
    _syncTimestamp: Date.now()
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
 * Get unsynced entries
 */
export async function getUnsyncedEntries(): Promise<IDBLogEntry[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['log_entries'], 'readonly')
    const store = transaction.objectStore('log_entries')
    const index = store.index('synced')
    const request = index.getAll(false) // false = not synced

    request.onsuccess = () => {
      resolve(request.result || [])
    }
    request.onerror = () => reject(new Error(`Failed to get unsynced entries: ${request.error?.message}`))
  })
}

// Sync Queue Operations

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(operation: 'insert' | 'update' | 'delete', entryId: string, entryData?: any): Promise<string> {
  const db = await getDB()
  const queueEntry: SyncQueueEntry = {
    id: crypto.randomUUID(),
    operation,
    entryId,
    entryData: entryData || null,
    timestamp: Date.now(),
    retryCount: 0
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
 * Get all sync queue entries
 */
export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readonly')
    const store = transaction.objectStore('sync_queue')
    const index = store.index('timestamp')
    const request = index.getAll() // Get all, sorted by timestamp

    request.onsuccess = () => {
      resolve(request.result || [])
    }
    request.onerror = () => reject(new Error(`Failed to get sync queue: ${request.error?.message}`))
  })
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
 * Get sync queue length
 */
export async function getSyncQueueLength(): Promise<number> {
  const queue = await getSyncQueue()
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

