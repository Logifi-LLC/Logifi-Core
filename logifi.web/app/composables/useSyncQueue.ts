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
  deleteEntryFromIndexedDB,
  type SyncQueueEntry
} from '~/utils/indexedDB'
import { useOffline } from './useOffline'

const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay

export const useSyncQueue = () => {
  const { isOnline, updateSyncProgress, resetSyncProgress } = useOffline()
  const queueLength = ref<number>(0)
  const isProcessing = ref<boolean>(false)
  const syncError = ref<string | null>(null)

  let backgroundSyncInterval: ReturnType<typeof setInterval> | null = null
  let isBackgroundSyncActive = false

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
    entryData?: any
  ): Promise<void> => {
    try {
      await addToSyncQueue(operation, entryId, entryData)
      await refreshQueueLength()
      
      // If online, try immediate sync
      if (isOnline.value) {
        processQueue()
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error)
      throw error
    }
  }

  /**
   * Refresh queue length
   */
  const refreshQueueLength = async (): Promise<void> => {
    queueLength.value = await getSyncQueueLength()
  }

  /**
   * Process a single queue item
   */
  const processQueueItem = async (item: SyncQueueEntry): Promise<boolean> => {
    try {
      let success = false

      switch (item.operation) {
        case 'insert':
          success = await syncInsert(item)
          break
        case 'update':
          success = await syncUpdate(item)
          break
        case 'delete':
          success = await syncDelete(item)
          break
      }

      if (success) {
        // Mark entry as synced if it exists
        try {
          await markEntryAsSynced(item.entryId)
        } catch (err) {
          // Entry might not exist (e.g., for deletes), that's okay
          console.warn('Could not mark entry as synced:', err)
        }
        
        // Remove from queue
        await removeFromSyncQueue(item.id)
        return true
      }

      return false
    } catch (error: any) {
      console.error(`Failed to process queue item ${item.id}:`, error)
      
      // Update retry count
      const newRetryCount = item.retryCount + 1
      await updateSyncQueueEntry(item.id, {
        retryCount: newRetryCount,
        lastError: error.message || String(error)
      })

      // If max retries reached, keep in queue but don't retry automatically
      if (newRetryCount >= MAX_RETRIES) {
        syncError.value = `Sync failed after ${MAX_RETRIES} retries: ${error.message || String(error)}`
        return false
      }

      // Schedule retry with exponential backoff
      setTimeout(() => {
        if (isOnline.value) {
          processQueue()
        }
      }, getRetryDelay(newRetryCount))

      return false
    }
  }

  /**
   * Sync insert operation
   */
  const syncInsert = async (item: SyncQueueEntry): Promise<boolean> => {
    if (!item.entryData) {
      throw new Error('Entry data missing for insert operation')
    }

    const { error } = await supabase
      .from('log_entries')
      .insert(item.entryData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return true
  }

  /**
   * Sync update operation
   */
  const syncUpdate = async (item: SyncQueueEntry): Promise<boolean> => {
    if (!item.entryData) {
      throw new Error('Entry data missing for update operation')
    }

    // Remove read-only fields
    const { id, user_id, created_at, updated_at, data_hash, version, ...updateData } = item.entryData

    const { error } = await supabase
      .from('log_entries')
      .update(updateData)
      .eq('id', item.entryId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return true
  }

  /**
   * Sync delete operation
   */
  const syncDelete = async (item: SyncQueueEntry): Promise<boolean> => {
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
   * Process sync queue
   */
  const processQueue = async (): Promise<void> => {
    if (!isOnline.value || isProcessing.value) {
      return
    }

    isProcessing.value = true
    syncError.value = null

    try {
      const queue = await getSyncQueue()
      
      if (queue.length === 0) {
        resetSyncProgress()
        await refreshQueueLength()
        isProcessing.value = false
        return
      }

      // Sort by timestamp (oldest first) and retry count (fewer retries first)
      queue.sort((a, b) => {
        if (a.retryCount !== b.retryCount) {
          return a.retryCount - b.retryCount
        }
        return a.timestamp - b.timestamp
      })

      // Filter out items that have exceeded max retries
      const processableItems = queue.filter(item => item.retryCount < MAX_RETRIES)
      
      if (processableItems.length === 0) {
        resetSyncProgress()
        await refreshQueueLength()
        isProcessing.value = false
        return
      }

      updateSyncProgress(0, processableItems.length, 'syncing')

      let successCount = 0
      for (let i = 0; i < processableItems.length; i++) {
        const item = processableItems[i]
        updateSyncProgress(i, processableItems.length, 'syncing')

        const success = await processQueueItem(item)
        if (success) {
          successCount++
        }

        // Small delay between items to avoid overwhelming the server
        if (i < processableItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      updateSyncProgress(processableItems.length, processableItems.length, 'complete')
      await refreshQueueLength()

      // If there are still items in queue (failed ones), keep processing
      const remainingQueue = await getSyncQueue()
      if (remainingQueue.length > 0 && isOnline.value) {
        // Wait a bit before retrying failed items
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

  /**
   * Start background sync
   */
  const startBackgroundSync = () => {
    if (isBackgroundSyncActive) {
      return
    }

    isBackgroundSyncActive = true

    // Process queue immediately if online
    if (isOnline.value) {
      processQueue()
    }

    // Set up periodic sync (every 10 seconds when online)
    backgroundSyncInterval = setInterval(() => {
      if (isOnline.value && !isProcessing.value) {
        processQueue()
      }
    }, 10000)
  }

  /**
   * Stop background sync
   */
  const stopBackgroundSync = () => {
    isBackgroundSyncActive = false

    if (backgroundSyncInterval) {
      clearInterval(backgroundSyncInterval)
      backgroundSyncInterval = null
    }
  }

  /**
   * Retry failed operations
   */
  const retryFailed = async (): Promise<void> => {
    const queue = await getSyncQueue()
    const failedItems = queue.filter(item => item.retryCount >= MAX_RETRIES)

    // Reset retry count for failed items
    for (const item of failedItems) {
      await updateSyncQueueEntry(item.id, {
        retryCount: 0,
        lastError: undefined
      })
    }

    // Process queue
    if (isOnline.value) {
      await processQueue()
    }
  }

  /**
   * Clear successfully synced operations (already handled by processQueue)
   */
  const clearQueue = async (): Promise<void> => {
    // This is handled automatically by processQueue
    // But we can manually clear if needed
    await refreshQueueLength()
  }

  /**
   * Get queue length
   */
  const getQueueLength = async (): Promise<number> => {
    await refreshQueueLength()
    return queueLength.value
  }

  // Initialize queue length
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
    refreshQueueLength
  }
}

