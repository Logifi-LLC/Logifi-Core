import { computed, ref, watch } from 'vue'
import { supabase } from '~/lib/supabase'
import {
  addToEndorsementSyncQueue,
  getEndorsementFromIndexedDB,
  getEndorsementSyncQueue,
  getEndorsementSyncQueueLength,
  removeFromEndorsementSyncQueue,
  saveEndorsementToIndexedDB,
  updateEndorsementInIndexedDB,
  type EndorsementSyncQueueEntry,
} from '~/utils/endorsementIndexedDB'
import { useOffline } from '~/composables/useOffline'

const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000

let processChain: Promise<void> = Promise.resolve()
const activeUserId = ref<string | null>(null)

async function getLocalAuthUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user?.id ?? activeUserId.value
}

async function fetchEndorsementRow(id: string) {
  const { data, error } = await supabase.from('endorsements').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

function isBenignDuplicateError(message: string): boolean {
  return /endorsement id conflict/i.test(message)
}

export const useEndorsementSyncQueue = () => {
  const { isOnline } = useOffline()
  const queueLength = ref(0)
  const isProcessing = ref(false)
  const syncError = ref<string | null>(null)

  const setActiveUserId = (userId: string | null) => {
    activeUserId.value = userId
    void refreshQueueLength()
  }

  const refreshQueueLength = async (): Promise<void> => {
    queueLength.value = await getEndorsementSyncQueueLength(activeUserId.value ?? undefined)
  }

  const enqueue = async (
    item: Omit<EndorsementSyncQueueEntry, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> => {
    const queueId = await addToEndorsementSyncQueue(
      item.operation,
      item.endorsementId,
      item.userId,
      item.payload
    )
    await refreshQueueLength()
    if (isOnline.value) void processQueue({ silent: true })
    return queueId
  }

  const processQueueItem = async (item: EndorsementSyncQueueEntry): Promise<boolean> => {
    const sessionUserId = await getLocalAuthUserId()
    if (!sessionUserId || item.userId !== sessionUserId) {
      throw new Error('Sync queue user does not match signed-in user')
    }

    switch (item.operation) {
      case 'request': {
        const { error } = await supabase.rpc('request_endorsement', item.payload as never)
        if (error) {
          if (isBenignDuplicateError(error.message)) break
          throw error
        }
        break
      }
      case 'issue': {
        const { error } = await supabase.rpc('issue_endorsement', item.payload as never)
        if (error) {
          if (isBenignDuplicateError(error.message)) break
          throw error
        }
        break
      }
      case 'import': {
        const { error } = await supabase.rpc('record_imported_endorsement', item.payload as never)
        if (error) {
          if (isBenignDuplicateError(error.message)) break
          throw error
        }
        break
      }
      case 'sign': {
        const { error } = await supabase.rpc('sign_endorsement', item.payload as never)
        if (error) throw error
        break
      }
      case 'cancel': {
        const { error } = await supabase.rpc('cancel_endorsement', {
          p_endorsement_id: item.endorsementId,
        })
        if (error) throw error
        break
      }
      default:
        throw new Error(`Unknown endorsement sync op: ${item.operation}`)
    }

    const remote = await fetchEndorsementRow(item.endorsementId)
    if (remote) {
      await saveEndorsementToIndexedDB(remote, sessionUserId, true)
    } else if (item.operation === 'cancel') {
      const local = await getEndorsementFromIndexedDB(item.endorsementId)
      if (local) {
        await updateEndorsementInIndexedDB(
          { ...local, status: 'cancelled', updated_at: new Date().toISOString() },
          { userId: sessionUserId, synced: true, lastSyncError: null }
        )
      }
    }

    await removeFromEndorsementSyncQueue(item.id)
    return true
  }

  const getRetryDelay = (retryCount: number): number => RETRY_DELAY_BASE * 2 ** retryCount

  const processQueueOnce = async (_options?: { silent?: boolean }): Promise<void> => {
    if (!isOnline.value || isProcessing.value) return
    const userId = await getLocalAuthUserId()
    if (!userId) return

    isProcessing.value = true
    syncError.value = null
    try {
      const queue = await getEndorsementSyncQueue(userId)
      for (const item of queue) {
        try {
          const ok = await processQueueItem(item)
          if (!ok) break
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          const newRetryCount = item.retryCount + 1
          const { updateEndorsementSyncQueueEntry } = await import('~/utils/endorsementIndexedDB')
          await updateEndorsementSyncQueueEntry(item.id, {
            retryCount: newRetryCount,
            lastError: message,
          })
          const local = await getEndorsementFromIndexedDB(item.endorsementId)
          if (local) {
            let revert = { ...local }
            if (
              item.operation === 'sign' &&
              local.status === 'signed' &&
              local.signature_hash === 'pending-local'
            ) {
              revert = {
                ...revert,
                status: 'draft',
                signed_at: null,
                signature_hash: null,
                cfi_number: null,
                cfi_expiration: null,
                instructor_full_name: null,
              }
            }
            await updateEndorsementInIndexedDB(revert, {
              userId,
              synced: false,
              lastSyncError: message,
            }).catch(() => {})
          }

          if (newRetryCount >= MAX_RETRIES) {
            syncError.value = message
            break
          }
          setTimeout(() => {
            void processQueue({ silent: true })
          }, getRetryDelay(newRetryCount))
          break
        }
      }
    } finally {
      isProcessing.value = false
      await refreshQueueLength()
    }
  }

  const processQueue = async (options?: { silent?: boolean }): Promise<void> => {
    const run = () => processQueueOnce(options)
    processChain = processChain.then(run, run)
    await processChain
  }

  const retryFailed = async (): Promise<void> => {
    syncError.value = null
    await processQueue()
  }

  const startBackgroundSync = (): void => {
    if (!isOnline.value) return
    void processQueue({ silent: true })
  }

  const hasPendingSync = computed(() => queueLength.value > 0)

  watch(isOnline, (online, wasOnline) => {
    if (online && !wasOnline) {
      void processQueue({ silent: true })
    }
  })

  return {
    queueLength,
    isProcessing,
    syncError,
    hasPendingSync,
    enqueue,
    processQueue,
    retryFailed,
    refreshQueueLength,
    setActiveUserId,
    startBackgroundSync,
  }
}