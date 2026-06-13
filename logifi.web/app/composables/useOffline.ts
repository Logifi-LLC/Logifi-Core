import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, isSupabaseAvailable } from '~/lib/supabase'
import { withTimeout } from '~/utils/promiseTimeout'

export const useOffline = () => {
  const isOnline = ref(false)
  const connectivityReady = ref(false)
  const isSyncing = ref<boolean>(false)
  const syncProgress = ref<{
    current: number
    total: number
    status: 'idle' | 'syncing' | 'error' | 'complete'
    error?: string
  }>({
    current: 0,
    total: 0,
    status: 'idle'
  })

  let connectivityCheckInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Check if Supabase is actually reachable (not just browser online status)
   */
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

  /**
   * Update online status
   */
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

  /**
   * Start connectivity monitoring
   */
  const startMonitoring = () => {
    if (typeof window === 'undefined') return

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', () => {
      isOnline.value = false
      connectivityReady.value = true
    })

    connectivityCheckInterval = setInterval(updateOnlineStatus, 90000)

    updateOnlineStatus()
  }

  /**
   * Stop connectivity monitoring
   */
  const stopMonitoring = () => {
    if (typeof window === 'undefined') return

    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', () => {
      isOnline.value = false
    })

    if (connectivityCheckInterval) {
      clearInterval(connectivityCheckInterval)
      connectivityCheckInterval = null
    }
  }

  /**
   * Update sync progress
   */
  const updateSyncProgress = (current: number, total: number, status: 'idle' | 'syncing' | 'error' | 'complete', error?: string) => {
    syncProgress.value = { current, total, status, error }
    isSyncing.value = status === 'syncing'
  }

  /**
   * Reset sync progress
   */
  const resetSyncProgress = () => {
    syncProgress.value = {
      current: 0,
      total: 0,
      status: 'idle'
    }
    isSyncing.value = false
  }

  onMounted(() => {
    startMonitoring()
  })

  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    isOnline: computed(() => isOnline.value),
    connectivityReady: computed(() => connectivityReady.value),
    isSyncing: computed(() => isSyncing.value),
    syncProgress: computed(() => syncProgress.value),
    checkOnlineStatus: updateOnlineStatus,
    updateSyncProgress,
    resetSyncProgress,
    startMonitoring,
    stopMonitoring
  }
}
