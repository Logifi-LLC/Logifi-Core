import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, isSupabaseAvailable } from '~/lib/supabase'

export const useOffline = () => {
  const isOnline = ref<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
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
      // Try a simple query to check connectivity
      const { error } = await supabase.from('log_entries').select('id').limit(1)
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
      return
    }

    // If browser says online, verify Supabase is reachable
    const supabaseReachable = await checkSupabaseConnectivity()
    isOnline.value = supabaseReachable
  }

  /**
   * Start connectivity monitoring
   */
  const startMonitoring = () => {
    if (typeof window === 'undefined') return

    // Listen to browser online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', () => {
      isOnline.value = false
    })

    // Periodic connectivity check (every 30 seconds)
    connectivityCheckInterval = setInterval(updateOnlineStatus, 30000)

    // Initial check
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
    isSyncing: computed(() => isSyncing.value),
    syncProgress: computed(() => syncProgress.value),
    checkOnlineStatus: updateOnlineStatus,
    updateSyncProgress,
    resetSyncProgress,
    startMonitoring,
    stopMonitoring
  }
}

