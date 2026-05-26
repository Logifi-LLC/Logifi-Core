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
  removeFromSyncQueue,
  removeQueuedOperationsForEntry,
  saveEntryToIndexedDB,
  saveSyncedEntryToIndexedDB,
  updateEntryInIndexedDB,
} from '../indexedDB'
import {
  createEmptyFlightTime,
  createEmptyOOOI,
  createEmptyPerformance,
  type LogEntry,
} from '../logbookTypes'

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

describe('indexedDB sync helpers', () => {
  beforeEach(async () => {
    await initIndexedDB()

    const entries = await getAllEntriesFromIndexedDB()
    await Promise.all(entries.map((entry) => deleteEntryFromIndexedDB(entry.id)))

    const queue = await getSyncQueue()
    await Promise.all(queue.map((item) => removeFromSyncQueue(item.id)))
  })

  it('stores confirmed server entries as synced', async () => {
    const entry = buildEntry('synced-entry')

    await saveSyncedEntryToIndexedDB(entry)

    const stored = await getEntryFromIndexedDB(entry.id)
    expect(stored?._synced).toBe(true)

    const unsyncedEntries = await getUnsyncedEntries()
    expect(unsyncedEntries).toEqual([])
  })

  it('removes queued operations for a deleted entry id', async () => {
    await addToSyncQueue('insert', 'ghost-entry', { id: 'ghost-entry' })
    await addToSyncQueue('update', 'ghost-entry', { id: 'ghost-entry' })
    await addToSyncQueue('insert', 'keep-entry', { id: 'keep-entry' })

    const removedCount = await removeQueuedOperationsForEntry('ghost-entry')
    const remainingQueue = await getSyncQueue()

    expect(removedCount).toBe(2)
    expect(remainingQueue).toHaveLength(1)
    expect(remainingQueue[0].entryId).toBe('keep-entry')
  })

  it('lets server-hydrated entries overwrite local unsynced state', async () => {
    const entry = buildEntry('merged-entry')
    await saveEntryToIndexedDB(entry)

    await updateEntryInIndexedDB(
      {
        ...entry,
        remarks: 'Merged from server',
        version: 3,
      },
      { synced: true }
    )

    const stored = await getEntryFromIndexedDB(entry.id)
    expect(stored?._synced).toBe(true)
    expect(stored?.remarks).toBe('Merged from server')
    expect(stored?.version).toBe(3)
  })
})
