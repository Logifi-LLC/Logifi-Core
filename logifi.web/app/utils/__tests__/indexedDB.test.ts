import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addToSyncQueue,
  deleteEntryFromIndexedDB,
  getAllEntriesFromIndexedDB,
  getEntryFromIndexedDB,
  getSyncQueue,
  getUnsyncedEntries,
  initIndexedDB,
  migrateLegacyLocalData,
  removeFromSyncQueue,
  removeQueuedOperationsForEntry,
  saveEntryToIndexedDB,
  saveSyncedEntryToIndexedDB,
  setMetadata,
  updateEntryInIndexedDB,
  METADATA_LAST_ACTIVE_USER_ID,
} from '../indexedDB'
import {
  createEmptyFlightTime,
  createEmptyOOOI,
  createEmptyPerformance,
  type LogEntry,
} from '../logbookTypes'

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function buildEntry(id: string): LogEntry {
  return {
    id,
    date: '2026-05-26',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane Single Engine Land',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    tags: [],
    logbookType: 'flight',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    flagged: false,
    isImported: true,
    importSource: 'logbook_builder',
  }
}

async function putLegacyEntry(entry: LogEntry): Promise<void> {
  const db = await initIndexedDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['log_entries'], 'readwrite')
    const store = tx.objectStore('log_entries')
    const request = store.put({
      ...entry,
      _synced: false,
      _syncTimestamp: Date.now(),
    })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearAllEntries(): Promise<void> {
  const db = await initIndexedDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['log_entries'], 'readwrite')
    const store = tx.objectStore('log_entries')
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

describe('indexedDB sync helpers', () => {
  beforeEach(async () => {
    await initIndexedDB()
    await clearAllEntries()

    const queue = await getSyncQueue()
    await Promise.all(queue.map((item) => removeFromSyncQueue(item.id)))
  })

  it('stores confirmed server entries as synced', async () => {
    const entry = buildEntry('synced-entry')

    await saveSyncedEntryToIndexedDB(entry, USER_A)

    const stored = await getEntryFromIndexedDB(entry.id)
    expect(stored?._synced).toBe(true)
    expect(stored?._userId).toBe(USER_A)

    const unsyncedEntries = await getUnsyncedEntries(USER_A)
    expect(unsyncedEntries).toEqual([])
  })

  it('isolates entries by user id', async () => {
    await saveEntryToIndexedDB(buildEntry('user-a-entry'), USER_A)
    await saveEntryToIndexedDB(buildEntry('user-b-entry'), USER_B)

    const userAEntries = await getAllEntriesFromIndexedDB(USER_A)
    const userBEntries = await getAllEntriesFromIndexedDB(USER_B)

    expect(userAEntries.map((e) => e.id)).toEqual(['user-a-entry'])
    expect(userBEntries.map((e) => e.id)).toEqual(['user-b-entry'])
  })

  it('removes queued operations for a deleted entry id', async () => {
    await addToSyncQueue('insert', 'ghost-entry', USER_A, { id: 'ghost-entry' })
    await addToSyncQueue('update', 'ghost-entry', USER_A, { id: 'ghost-entry' })
    await addToSyncQueue('insert', 'keep-entry', USER_A, { id: 'keep-entry' })

    const removedCount = await removeQueuedOperationsForEntry('ghost-entry', USER_A)
    const remainingQueue = await getSyncQueue(USER_A)

    expect(removedCount).toBe(2)
    expect(remainingQueue).toHaveLength(1)
    expect(remainingQueue[0].entryId).toBe('keep-entry')
  })

  it('filters sync queue by user id', async () => {
    await addToSyncQueue('insert', 'a-entry', USER_A, { id: 'a-entry' })
    await addToSyncQueue('insert', 'b-entry', USER_B, { id: 'b-entry' })

    expect(await getSyncQueue(USER_A)).toHaveLength(1)
    expect(await getSyncQueue(USER_B)).toHaveLength(1)
  })

  it('lets server-hydrated entries overwrite local unsynced state', async () => {
    const entry = buildEntry('merged-entry')
    await saveEntryToIndexedDB(entry, USER_A)

    await updateEntryInIndexedDB(
      {
        ...entry,
        remarks: 'Merged from server',
        version: 3,
      },
      { synced: true, userId: USER_A }
    )

    const stored = await getEntryFromIndexedDB(entry.id)
    expect(stored?._synced).toBe(true)
    expect(stored?.remarks).toBe('Merged from server')
    expect(stored?.version).toBe(3)
  })

  it('assigns legacy unscoped entries to returning user only', async () => {
    await putLegacyEntry(buildEntry('legacy-entry'))

    await setMetadata(METADATA_LAST_ACTIVE_USER_ID, USER_A)
    await migrateLegacyLocalData(USER_A)

    expect(await getAllEntriesFromIndexedDB(USER_A)).toHaveLength(1)
    expect(await getAllEntriesFromIndexedDB(USER_B)).toHaveLength(0)

    await putLegacyEntry(buildEntry('legacy-entry-2'))
    await migrateLegacyLocalData(USER_B)
    expect(await getAllEntriesFromIndexedDB(USER_B)).toHaveLength(0)
  })
})
