import { ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { apiFetch } from '~/utils/apiFetch'
import { useAuth } from '~/composables/useAuth'

export function useLogbookTransferRequest() {
  const { user, getAccessToken } = useAuth()
  const hasPendingRequest = ref(false)
  const loadingStatus = ref(false)

  async function refreshStatus() {
    if (!user.value?.id) {
      hasPendingRequest.value = false
      return
    }
    loadingStatus.value = true
    try {
      const { data, error } = await supabase
        .from('logbook_transfer_requests')
        .select('id')
        .eq('user_id', user.value.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (error) {
        console.warn('[logbook-transfer] status check failed:', error.message)
        return
      }
      hasPendingRequest.value = !!data
    } finally {
      loadingStatus.value = false
    }
  }

  async function submitRequest(payload: { sourceApp?: string; note?: string }) {
    const token = getAccessToken()
    if (!token) {
      throw new Error('Sign in to request a transfer.')
    }

    const result = await apiFetch<{ success: boolean; alreadyRequested?: boolean }>(
      '/api/logbook-transfer-request',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          sourceApp: payload.sourceApp || null,
          note: payload.note || null,
        },
      },
    )

    hasPendingRequest.value = true
    return result
  }

  return {
    hasPendingRequest,
    loadingStatus,
    refreshStatus,
    submitRequest,
  }
}
