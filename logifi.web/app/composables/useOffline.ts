import { ref, computed } from 'vue'
import { supabase, isSupabaseAvailable } from '~/lib/supabase'
import { withTimeout } from '~/utils/promiseTimeout'

const globalIsOnline = ref(false)
const globalConnectivityReady = ref(false)
const globalIsSyncing = ref(false)
const globalSyncProgress = ref<{
  current: number
  total: number
  status: 'idle' | 'syncing' | 'error' | 'complete'
  error?: string
}>({
  current: 0,
  total: 0,
  status: 'idle',
})

let connectivityCheckInterval: ReturnType<typeof setInterval> | null = null
let monitoringStarted = false
let monitoringRefCount = 0
let handleOnline: (() => void) | null = null
let handleOffline: (() => void) | null = null

export const useOffline = () => {
  const isOnline = globalIsOnline
  const connectivityReady = globalConnectivityReady
  const isSyncing = globalIsSyncing
  const syncProgress = globalSyncProgress

  const checkSupabaseConnectivity = async (): Promise<boolean> => {
    if (!isSupabaseAvailable()) {
      return false
    }

    try {
      const { error } = await withTimeout(
        supabase.from('log_entries').select('id').limit(1),
        5000,
        'Supabase connectivity check'
      )
      return !error
    } catch {
      return false
    }
  }

  const updateOnlineStatus = async () => {
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (!browserOnline) {
      isOnline.value = false
      connectivityReady.value = true
      return
    }

    const supabaseReachable = await checkSupabaseConnectivity()
    isOnline.value = supabaseReachable
    connectivityReady.value = true
  }

  const startMonitoring = () => {
    if (typeof window === 'undefined') return

    monitoringRefCount += 1
    if (monitoringStarted) return
    monitoringStarted = true

    handleOnline = () => {
      void updateOnlineStatus()
    }
    handleOffline = () => {
      isOnline.value = false
      connectivityReady.value = true
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    connectivityCheckInterval = setInterval(() => {
      void updateOnlineStatus()
    }, 90000)

    void updateOnlineStatus()
  }

  const stopMonitoring = () => {
    if (typeof window === 'undefined') return
    if (monitoringRefCount > 0) {
      monitoringRefCount -= 1
    }
    if (monitoringRefCount > 0) return

    if (handleOnline) {
      window.removeEventListener('online', handleOnline)
      handleOnline = null
    }
    if (handleOffline) {
      window.removeEventListener('offline', handleOffline)
      handleOffline = null
    }

    if (connectivityCheckInterval) {
      clearInterval(connectivityCheckInterval)
      connectivityCheckInterval = null
    }

    monitoringStarted = false
  }

  const updateSyncProgress = (
    current: number,
    total: number,
    status: 'idle' | 'syncing' | 'error' | 'complete',
    error?: string
  ) => {
    syncProgress.value = { current, total, status, error }
    isSyncing.value = status === 'syncing'
  }

  const resetSyncProgress = () => {
    syncProgress.value = {
      current: 0,
      total: 0,
      status: 'idle',
    }
    isSyncing.value = false
  }

  return {
    isOnline: computed(() => isOnline.value),
    connectivityReady: computed(() => connectivityReady.value),
    isSyncing: computed(() => isSyncing.value),
    syncProgress: computed(() => syncProgress.value),
    checkOnlineStatus: updateOnlineStatus,
    updateSyncProgress,
    resetSyncProgress,
    startMonitoring,
    stopMonitoring,
  }
}
