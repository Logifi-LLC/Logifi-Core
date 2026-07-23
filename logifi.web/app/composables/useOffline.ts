import { ref, computed } from 'vue'
import { supabase, isSupabaseAvailable } from '~/lib/supabase'
import { getSupabaseConfig } from '~/config/supabase'
import { readOfflineSessionSnapshot, writeOfflineSessionSnapshot } from '~/utils/cachedSupabaseSession'

const initialBrowserOnline =
  typeof navigator !== 'undefined' ? navigator.onLine : true

const globalIsOnline = ref(initialBrowserOnline)
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

/** Backoff after failed probes so recovery is faster than a fixed 90s poll. */
const BACKOFF_MS = [15_000, 30_000, 60_000, 90_000] as const
const STEADY_ONLINE_POLL_MS = 90_000

let connectivityCheckTimeout: ReturnType<typeof setTimeout> | null = null
let backoffIndex = 0
let monitoringStarted = false
let monitoringRefCount = 0
let handleOnline: (() => void) | null = null
let handleOffline: (() => void) | null = null
let handleVisibility: (() => void) | null = null
/** After we call stop/startAutoRefresh we own visibility-driven refresh. */
let ownsAuthRefreshControl = false
let updateInFlight: Promise<void> | null = null

function clearScheduledCheck() {
  if (connectivityCheckTimeout) {
    clearTimeout(connectivityCheckTimeout)
    connectivityCheckTimeout = null
  }
}

function scheduleNextCheck(delayMs: number) {
  clearScheduledCheck()
  connectivityCheckTimeout = setTimeout(() => {
    void updateOnlineStatus()
  }, delayMs)
}

async function pauseAuthAutoRefresh() {
  if (!isSupabaseAvailable()) return
  try {
    ownsAuthRefreshControl = true
    await supabase.auth.stopAutoRefresh()
  } catch (err) {
    console.warn('[useOffline] stopAutoRefresh failed:', err)
  }
}

async function resumeAuthAutoRefresh() {
  if (!isSupabaseAvailable()) return
  try {
    ownsAuthRefreshControl = true
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      await supabase.auth.stopAutoRefresh()
      return
    }
    await supabase.auth.startAutoRefresh()
  } catch (err) {
    console.warn('[useOffline] startAutoRefresh failed:', err)
  }
}

async function restoreSdkSessionIfNeeded() {
  if (!isSupabaseAvailable()) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      writeOfflineSessionSnapshot(session)
      return
    }

    const snapshot = readOfflineSessionSnapshot()
    if (!snapshot?.access_token || !snapshot.refresh_token) return

    const { data, error } = await supabase.auth.setSession({
      access_token: snapshot.access_token,
      refresh_token: snapshot.refresh_token,
    })
    if (error) {
      console.warn('[useOffline] setSession on reconnect failed:', error.message)
      return
    }
    if (data.session) {
      writeOfflineSessionSnapshot(data.session)
    }
  } catch (err) {
    console.warn('[useOffline] restoreSdkSessionIfNeeded failed:', err)
  }
}

/**
 * Unauthenticated reachability probe — does not touch auth tokens / refresh.
 */
async function checkSupabaseConnectivity(): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    return false
  }

  const config = getSupabaseConfig()
  if (!config?.url) {
    return false
  }

  const healthUrl = `${config.url.replace(/\/$/, '')}/auth/v1/health`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    // Any HTTP response means the host is reachable (even 404/5xx).
    return response.status > 0
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function updateOnlineStatus(): Promise<void> {
  if (updateInFlight) {
    await updateInFlight
    return
  }

  updateInFlight = (async () => {
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const wasOnline = globalIsOnline.value

    if (!browserOnline) {
      globalIsOnline.value = false
      globalConnectivityReady.value = true
      backoffIndex = 0
      clearScheduledCheck()
      if (wasOnline) {
        await pauseAuthAutoRefresh()
      }
      return
    }

    const supabaseReachable = await checkSupabaseConnectivity()
    globalIsOnline.value = supabaseReachable
    globalConnectivityReady.value = true

    if (supabaseReachable) {
      backoffIndex = 0
      if (!wasOnline) {
        await restoreSdkSessionIfNeeded()
      }
      await resumeAuthAutoRefresh()
      scheduleNextCheck(STEADY_ONLINE_POLL_MS)
    } else {
      await pauseAuthAutoRefresh()
      const delay = BACKOFF_MS[Math.min(backoffIndex, BACKOFF_MS.length - 1)]
      backoffIndex = Math.min(backoffIndex + 1, BACKOFF_MS.length - 1)
      scheduleNextCheck(delay)
    }
  })()

  try {
    await updateInFlight
  } finally {
    updateInFlight = null
  }
}

export const useOffline = () => {
  const isOnline = globalIsOnline
  const connectivityReady = globalConnectivityReady
  const isSyncing = globalIsSyncing
  const syncProgress = globalSyncProgress

  const startMonitoring = () => {
    if (typeof window === 'undefined') return

    monitoringRefCount += 1
    if (monitoringStarted) return
    monitoringStarted = true

    handleOnline = () => {
      backoffIndex = 0
      void updateOnlineStatus()
    }
    handleOffline = () => {
      globalIsOnline.value = false
      globalConnectivityReady.value = true
      backoffIndex = 0
      clearScheduledCheck()
      void pauseAuthAutoRefresh()
    }
    handleVisibility = () => {
      if (!ownsAuthRefreshControl) return
      if (document.visibilityState === 'visible' && globalIsOnline.value) {
        void resumeAuthAutoRefresh()
      } else if (document.visibilityState === 'hidden') {
        void pauseAuthAutoRefresh()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

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
    if (handleVisibility) {
      document.removeEventListener('visibilitychange', handleVisibility)
      handleVisibility = null
    }

    clearScheduledCheck()
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
