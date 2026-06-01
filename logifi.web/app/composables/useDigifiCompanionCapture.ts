import { computed, onUnmounted, ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import type { DigifiCapturePhoto, DigifiCaptureSessionResponse } from '~/utils/digifiTypes'

interface SessionStatusResponse {
  ok: true
  sessionId: string
  isActive: boolean
  expiresAt: string
}

interface CapturePhotosResponse {
  ok: true
  photos: DigifiCapturePhoto[]
}

function toQrUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`
}

export function useDigifiCompanionCapture() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const creatingSession = ref(false)
  const sessionError = ref<string | null>(null)
  const sessionId = ref<string | null>(null)
  const sessionToken = ref<string | null>(null)
  const mobileUrl = ref<string | null>(null)
  const expiresAt = ref<string | null>(null)
  const qrDataUrl = ref<string | null>(null)
  const photos = ref<DigifiCapturePhoto[]>([])
  const loadingPhotos = ref(false)
  const selectedPhotoId = ref<string | null>(null)
  let channel: ReturnType<typeof supabase.channel> | null = null

  const selectedPhoto = computed(() => photos.value.find((photo) => photo.id === selectedPhotoId.value) ?? null)
  const isSessionActive = computed(() => {
    if (!expiresAt.value) return false
    return new Date(expiresAt.value).getTime() > Date.now()
  })

  function authHeaders(): Record<string, string> {
    const token = getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadPhotos(): Promise<DigifiCapturePhoto[]> {
    if (!sessionId.value) return []
    const previousIds = new Set(photos.value.map((photo) => photo.id))
    loadingPhotos.value = true
    try {
      const result = await $fetch<CapturePhotosResponse>('/api/digifi/capture/photos', {
        method: 'GET',
        headers: authHeaders(),
        query: { sessionId: sessionId.value },
      })
      const newPhotos = result.photos.filter((photo) => !previousIds.has(photo.id))
      photos.value = result.photos
      if (!selectedPhotoId.value && result.photos.length > 0) {
        selectedPhotoId.value = result.photos[0].id
      }
      return newPhotos
    } catch (error) {
      console.error('[digifi-capture] failed to load photos:', error)
      return []
    } finally {
      loadingPhotos.value = false
    }
  }

  function disconnectRealtime() {
    if (!channel) return
    supabase.removeChannel(channel)
    channel = null
  }

  function connectRealtime(currentSessionId: string) {
    disconnectRealtime()
    channel = supabase
      .channel(`digifi-capture:${currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'digifi_capture_photos',
          filter: `session_id=eq.${currentSessionId}`,
        },
        () => {
          loadPhotos()
        }
      )
      .subscribe()
  }

  async function createSession() {
    if (!isAuthenticated.value) {
      sessionError.value = 'Sign in to create a capture session.'
      return
    }
    creatingSession.value = true
    sessionError.value = null
    photos.value = []
    selectedPhotoId.value = null
    try {
      const result = await $fetch<DigifiCaptureSessionResponse>('/api/digifi/capture/session', {
        method: 'POST',
        headers: authHeaders(),
      })
      sessionId.value = result.sessionId
      sessionToken.value = result.token
      mobileUrl.value = result.mobileUrl
      expiresAt.value = result.expiresAt
      qrDataUrl.value = toQrUrl(result.mobileUrl)
      connectRealtime(result.sessionId)
      await loadPhotos()
    } catch (error: unknown) {
      sessionError.value = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
        ?? 'Could not create capture session.'
    } finally {
      creatingSession.value = false
    }
  }

  async function refreshSessionStatus() {
    if (!sessionToken.value) return
    try {
      const result = await $fetch<SessionStatusResponse>(`/api/digifi/capture/session/${sessionToken.value}`)
      expiresAt.value = result.expiresAt
      if (!result.isActive) disconnectRealtime()
    } catch {
      // best effort only
    }
  }

  async function getPhotoFile(photo: DigifiCapturePhoto): Promise<File | null> {
    if (!photo.signedUrl) return null
    const response = await fetch(photo.signedUrl)
    if (!response.ok) {
      throw new Error('Could not fetch capture photo.')
    }
    const blob = await response.blob()
    const ext = photo.mimeType === 'image/png' ? 'png' : photo.mimeType === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `capture-${photo.id}.${ext}`, { type: photo.mimeType || blob.type })
  }

  async function getSelectedPhotoFile(): Promise<File | null> {
    const current = selectedPhoto.value
    if (!current) return null
    return getPhotoFile(current)
  }

  onUnmounted(() => {
    disconnectRealtime()
  })

  return {
    creatingSession,
    sessionError,
    sessionId,
    sessionToken,
    expiresAt,
    mobileUrl,
    qrDataUrl,
    photos,
    selectedPhotoId,
    selectedPhoto,
    loadingPhotos,
    isSessionActive,
    createSession,
    loadPhotos,
    refreshSessionStatus,
    getPhotoFile,
    getSelectedPhotoFile,
  }
}
