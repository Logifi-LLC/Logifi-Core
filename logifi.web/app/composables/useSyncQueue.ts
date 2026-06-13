import { ref, computed } from 'vue'
import { supabase } from '~/lib/supabase'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueEntry,
  getSyncQueueLength,
  markEntryAsSynced,
  updateEntryInIndexedDB,
  type SyncQueueEntry
} from '~/utils/indexedDB'
import { useOffline } from './useOffline'

const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay

/** Shared across composable instances so dashboard and sync share the same active user. */
const activeUserId = ref<string | null>(null)

export const useSyncQueue = () => {
  const { isOnline, updateSyncProgress, resetSyncProgress } = useOffline()
  const queueLength = ref<number>(0)
  const isProcessing = ref<boolean>(false)
  const syncError = ref<string | null>(null)

  let backgroundSyncInterval: ReturnType<typeof setInterval> | null = null
  let isBackgroundSyncActive = false

  const setActiveUserId = (userId: string | null) => {
    activeUserId.value = userId
    void refreshQueueLength()
  }

  const getCurrentUserId = (): string | null => activeUserId.value

  /**
   * Calculate exponential backoff delay
   */
  const getRetryDelay = (retryCount: number): number => {
    return RETRY_DELAY_BASE * Math.pow(2, retryCount)
  }

  /**
   * Add operation to sync queue
   */
  const addToQueue = async (
    operation: 'insert' | 'update' | 'delete',
    entryId: string,
    entryData?: any,
    userId?: string
  ): Promise<void> => {
    const scopedUserId = userId ?? activeUserId.value
    if (!scopedUserId) {
      throw new Error('Cannot queue sync operation without an active user')
    }

    try {
      await addToSyncQueue(operation, entryId, scopedUserId, entryData)
      await refreshQueueLength()

      if (isOnline.value) {
        processQueue()
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error)
      throw error
    }
  }

  /**
   * Refresh queue length for active user
   */
  const refreshQueueLength = async (): Promise<void> => {
    queueLength.value = await getSyncQueueLength(activeUserId.value ?? undefined)
  }

  /**
   * Process a single queue item
   */
  const processQueueItem = async (item: SyncQueueEntry): Promise<boolean> => {
    try {
      let success = false
      let insertedData = null

      switch (item.operation) {
        case 'insert':
          insertedData = await syncInsert(item)
          success = !!insertedData
          break
        case 'update':
          success = await syncUpdate(item)
          break
        case 'delete':
          success = await syncDelete(item)
          break
      }

      if (success) {
        const userId = item.userId ?? activeUserId.value
        if (item.operation === 'insert' && insertedData && insertedData.id && userId) {
          try {
            const { getAllEntriesFromIndexedDB, updateEntryInIndexedDB } = await import('~/utils/indexedDB')
            const localEntries = await getAllEntriesFromIndexedDB(userId)
            const localEntry = localEntries.find((e) => e.id === item.entryId)

            if (localEntry) {
              if (insertedData.id !== item.entryId) {
                await updateEntryInIndexedDB(
                  {
                    ...localEntry,
                    id: insertedData.id,
                    dataHash: insertedData.data_hash || undefined,
                    version: insertedData.version || undefined,
                  },
                  { userId, synced: true }
                )
              } else {
                await updateEntryInIndexedDB(
                  {
                    ...localEntry,
                    dataHash: insertedData.data_hash || undefined,
                    version: insertedData.version || undefined,
                  },
                  { userId, synced: true }
                )
              }
            }
          } catch (err) {
            console.warn('[SyncQueue] Failed to update IndexedDB:', err)
          }
        }

        try {
          await markEntryAsSynced(item.entryId)
        } catch (err) {
          console.warn('Could not mark entry as synced:', err)
        }

        await removeFromSyncQueue(item.id)
        return true
      }

      return false
    } catch (error: any) {
      console.error(`Failed to process queue item ${item.id}:`, error)

      const newRetryCount = item.retryCount + 1
      await updateSyncQueueEntry(item.id, {
        retryCount: newRetryCount,
        lastError: error.message || String(error),
      })

      if (newRetryCount >= MAX_RETRIES) {
        syncError.value = `Sync failed after ${MAX_RETRIES} retries: ${error.message || String(error)}`
        return false
      }

      setTimeout(() => {
        if (isOnline.value) {
          processQueue()
        }
      }, getRetryDelay(newRetryCount))

      return false
    }
  }

  /**
   * Sync insert operation — user_id must match queued item owner
   */
  const syncInsert = async (item: SyncQueueEntry): Promise<any> => {
    if (!item.entryData) {
      throw new Error('Entry data missing for insert operation')
    }

    const insertData = { ...item.entryData }

    if (!insertData.user_id) {
      if (!item.userId) {
        throw new Error('Queued insert missing userId – refusing cross-account sync')
      }
      insertData.user_id = item.userId
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser?.id) {
      throw new Error('Not authenticated – cannot sync insert')
    }
    if (item.userId && authUser.id !== item.userId) {
      throw new Error('Active session does not match queued item user – skipping cross-account sync')
    }
    if (insertData.user_id !== authUser.id) {
      throw new Error('Queued insert user_id does not match active session')
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (insertData.id && !uuidRegex.test(insertData.id)) {
      console.warn('[SyncQueue] Warning: Entry ID is not a UUID:', insertData.id)
      delete insertData.id
    }

    const { data, error } = await supabase
      .from('log_entries')
      .insert(insertData)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[SyncQueue] Insert error:', error.code, error.message, error.details)
      throw error
    }
    if (!data) {
      throw new Error('Insert returned no row (possible RLS or constraint issue)')
    }

    return data
  }

  /**
   * Sync update operation
   */
  const syncUpdate = async (item: SyncQueueEntry): Promise<boolean> => {
    if (!item.entryData) {
      throw new Error('Entry data missing for update operation')
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser?.id) {
      throw new Error('Not authenticated – cannot sync update')
    }
    if (item.userId && authUser.id !== item.userId) {
      throw new Error('Active session does not match queued item user – skipping cross-account sync')
    }

    const { id, user_id, created_at, updated_at, data_hash, version, ...updateData } = item.entryData

    let supabaseId = item.entryId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(item.entryId) && item.entryData) {
      try {
        const { data: matchingEntries } = await supabase
          .from('log_entries')
          .select('id')
          .eq('date', item.entryData.date)
          .eq('registration', item.entryData.registration)
          .eq('departure', item.entryData.departure)
          .eq('destination', item.entryData.destination)
          .limit(1)

        if (matchingEntries && matchingEntries.length > 0) {
          supabaseId = matchingEntries[0].id
        }
      } catch (err) {
        console.warn('[SyncQueue] Failed to find UUID for update:', err)
      }
    }

    const { data, error } = await supabase
      .from('log_entries')
      .update(updateData)
      .eq('id', supabaseId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[SyncQueue] Update error:', error.code, error.message, error.details)
      throw error
    }
    if (!data) {
      throw new Error('Update returned no row (possible RLS or row not found)')
    }

    return true
  }

  /**
   * Sync delete operation
   */
  const syncDelete = async (item: SyncQueueEntry): Promise<boolean> => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser?.id) {
      throw new Error('Not authenticated – cannot sync delete')
    }
    if (item.userId && authUser.id !== item.userId) {
      throw new Error('Active session does not match queued item user – skipping cross-account sync')
    }

    const { error } = await supabase
      .from('log_entries')
      .delete()
      .eq('id', item.entryId)

    if (error) {
      throw error
    }

    return true
  }

  /**
   * Process sync queue for the active user only
   */
  const processQueue = async (): Promise<void> => {
    if (!isOnline.value || isProcessing.value) {
      return
    }

    const userId = activeUserId.value
    if (!userId) {
      return
    }

    isProcessing.value = true
    syncError.value = null

    try {
      const queue = await getSyncQueue(userId)

      if (queue.length === 0) {
        resetSyncProgress()
        await refreshQueueLength()
        isProcessing.value = false
        return
      }

      queue.sort((a, b) => {
        if (a.retryCount !== b.retryCount) {
          return a.retryCount - b.retryCount
        }
        return a.timestamp - b.timestamp
      })

      const processableItems = queue.filter((item) => item.retryCount < MAX_RETRIES)

      if (processableItems.length === 0) {
        resetSyncProgress()
        await refreshQueueLength()
        isProcessing.value = false
        return
      }

      updateSyncProgress(0, processableItems.length, 'syncing')

      for (let i = 0; i < processableItems.length; i++) {
        const item = processableItems[i]
        updateSyncProgress(i, processableItems.length, 'syncing')
        await processQueueItem(item)

        if (i < processableItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      updateSyncProgress(processableItems.length, processableItems.length, 'complete')
      await refreshQueueLength()

      const remainingQueue = await getSyncQueue(userId)
      if (remainingQueue.length > 0 && isOnline.value) {
        setTimeout(() => {
          if (isOnline.value) {
            processQueue()
          }
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error processing sync queue:', error)
      syncError.value = error.message || String(error)
      updateSyncProgress(0, 0, 'error', syncError.value)
    } finally {
      isProcessing.value = false
    }
  }

  const startBackgroundSync = () => {
    if (isBackgroundSyncActive) {
      return
    }

    isBackgroundSyncActive = true

    if (isOnline.value) {
      processQueue()
    }

    backgroundSyncInterval = setInterval(() => {
      if (isOnline.value && !isProcessing.value) {
        processQueue()
      }
    }, 10000)
  }

  const stopBackgroundSync = () => {
    isBackgroundSyncActive = false

    if (backgroundSyncInterval) {
      clearInterval(backgroundSyncInterval)
      backgroundSyncInterval = null
    }
  }

  const retryFailed = async (): Promise<void> => {
    const userId = activeUserId.value
    if (!userId) return

    const queue = await getSyncQueue(userId)
    const failedItems = queue.filter((item) => item.retryCount >= MAX_RETRIES)

    for (const item of failedItems) {
      await updateSyncQueueEntry(item.id, {
        retryCount: 0,
        lastError: undefined,
      })
    }

    if (isOnline.value) {
      await processQueue()
    }
  }

  const clearQueue = async (): Promise<void> => {
    await refreshQueueLength()
  }

  const getQueueLength = async (): Promise<number> => {
    await refreshQueueLength()
    return queueLength.value
  }

  refreshQueueLength()

  return {
    queueLength: computed(() => queueLength.value),
    isProcessing: computed(() => isProcessing.value),
    syncError: computed(() => syncError.value),
    addToQueue,
    processQueue,
    startBackgroundSync,
    stopBackgroundSync,
    retryFailed,
    clearQueue,
    getQueueLength,
    refreshQueueLength,
    setActiveUserId,
    getCurrentUserId,
  }
}
