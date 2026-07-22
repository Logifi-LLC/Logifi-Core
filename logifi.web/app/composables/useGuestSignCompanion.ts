import { computed, onUnmounted, ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import { apiFetch } from '~/utils/apiFetch'

function toQrUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(text)}`
}

type CreateSessionResponse = {
  ok: true
  sessionId: string
  token: string
  expiresAt: string
  mobileUrl: string
}

type SessionStatusResponse = {
  ok: true
  sessionId: string
  status: string
  isPending: boolean
  expiresAt: string
  alreadySigned: boolean
}

export function useGuestSignCompanion() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const creatingSession = ref(false)
  const sessionError = ref<string | null>(null)
  const sessionId = ref<string | null>(null)
  const sessionToken = ref<string | null>(null)
  const entryId = ref<string | null>(null)
  const mobileUrl = ref<string | null>(null)
  const expiresAt = ref<string | null>(null)
  const qrDataUrl = ref<string | null>(null)
  const completed = ref(false)
  const showModal = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let channel: ReturnType<typeof supabase.channel> | null = null

  const isSessionActive = computed(() => {
    if (completed.value) return false
    if (!expiresAt.value) return false
    return new Date(expiresAt.value).getTime() > Date.now()
  })

  function authHeaders(): Record<string, string> {
    const token = getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function disconnectRealtime() {
    if (!channel) return
    supabase.removeChannel(channel)
    channel = null
  }

  function cleanup() {
    stopPolling()
    disconnectRealtime()
  }

  function markCompleted() {
    if (completed.value) return
    completed.value = true
    cleanup()
  }

  function connectRealtime(logEntryId: string) {
    disconnectRealtime()
    channel = supabase
      .channel(`guest-sign:${logEntryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flight_signatures',
          filter: `log_entry_id=eq.${logEntryId}`,
        },
        () => {
          markCompleted()
        }
      )
      .subscribe()
  }

  async function pollSessionStatus() {
    if (!sessionToken.value || completed.value) return
    try {
      const status = await apiFetch<SessionStatusResponse>('/api/guest-sign/session', {
        method: 'GET',
        query: { token: sessionToken.value },
      })
      if (status.alreadySigned || status.status === 'completed') {
        markCompleted()
      }
      if (status.status === 'expired' || (!status.isPending && !status.alreadySigned)) {
        sessionError.value = 'Signing session expired. Create a new QR code.'
        cleanup()
      }
    } catch {
      // ignore transient poll errors
    }
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      void pollSessionStatus()
    }, 2000)
  }

  async function createSession(logEntryId: string): Promise<boolean> {
    if (!isAuthenticated.value) {
      sessionError.value = 'Sign in to create a guest signing QR code.'
      return false
    }
    creatingSession.value = true
    sessionError.value = null
    completed.value = false
    cleanup()
    try {
      const result = await apiFetch<CreateSessionResponse>('/api/guest-sign/session', {
        method: 'POST',
        headers: authHeaders(),
        body: { entryId: logEntryId },
      })
      sessionId.value = result.sessionId
      sessionToken.value = result.token
      entryId.value = logEntryId
      mobileUrl.value = result.mobileUrl
      expiresAt.value = result.expiresAt
      qrDataUrl.value = toQrUrl(result.mobileUrl)
      showModal.value = true
      connectRealtime(logEntryId)
      startPolling()
      return true
    } catch (error: unknown) {
      sessionError.value =
        (error as { data?: { statusMessage?: string } })?.data?.statusMessage ||
        'Could not create guest sign session.'
      return false
    } finally {
      creatingSession.value = false
    }
  }

  function closeModal() {
    showModal.value = false
    if (!completed.value) {
      cleanup()
    }
  }

  async function copyMobileUrl(): Promise<void> {
    if (!mobileUrl.value || !import.meta.client) return
    await navigator.clipboard.writeText(mobileUrl.value)
  }

  function reset() {
    showModal.value = false
    sessionId.value = null
    sessionToken.value = null
    entryId.value = null
    mobileUrl.value = null
    expiresAt.value = null
    qrDataUrl.value = null
    completed.value = false
    sessionError.value = null
    cleanup()
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    creatingSession,
    sessionError,
    sessionId,
    entryId,
    mobileUrl,
    expiresAt,
    qrDataUrl,
    completed,
    showModal,
    isSessionActive,
    createSession,
    closeModal,
    copyMobileUrl,
    reset,
    markCompleted,
  }
}
