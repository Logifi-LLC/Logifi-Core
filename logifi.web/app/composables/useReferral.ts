import { computed, ref } from 'vue'
import type { AttributionBlock } from '../../shared/referrals'
import { apiFetch } from '~/utils/apiFetch'
import { shareReferralLink, shareUrlForClient } from '~/utils/referralCapture'
import { isAuthEmailVerified, messageFromClaimError } from '~/utils/referralClaimAttempt'
import { claimResultMessage } from '~/utils/referralClaimClient'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { useAuth } from '~/composables/useAuth'

export interface ReferralStatus {
  code: string
  shareUrl: string
  rewardedCount: number
  rewardCap: number
  referred: boolean
  canEnterCode: boolean
}

interface ReferralClaimResult {
  ok: boolean
  attributed: boolean
  friendCreditsGranted: boolean
  reason?: AttributionBlock
}

export function useReferral() {
  const status = ref<ReferralStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { getAccessToken, user } = useAuth()

  function authHeaders(): Record<string, string> | null {
    const token = getAccessToken()
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  }

  async function load() {
    const headers = authHeaders()
    if (!headers) return
    loading.value = true
    error.value = null
    try {
      status.value = await apiFetch<ReferralStatus>('/api/referrals', { headers })
    } catch {
      error.value = 'Invites are unavailable'
    } finally {
      loading.value = false
    }
  }

  async function claim(code: string): Promise<string | null> {
    const headers = authHeaders()
    if (!headers) return 'Sign in to apply a code'
    let result: ReferralClaimResult
    try {
      result = await apiFetch<ReferralClaimResult>('/api/referrals/claim', {
        method: 'POST',
        headers,
        body: { code },
      })
    } catch (error) {
      return messageFromClaimError(error)
    }
    await load()
    return claimResultMessage(result, {
      interactive: true,
      emailVerified: isAuthEmailVerified(user.value),
      hadStoredCode: true,
    })
  }

  const shareUrl = computed(() => {
    const code = status.value?.code
    if (!code || typeof window === 'undefined') return status.value?.shareUrl ?? ''
    return shareUrlForClient(code, isCapacitorNative(), window.location.origin)
  })

  async function share(): Promise<'shared' | 'copied'> {
    if (!status.value) throw new Error('Invite is still loading')
    return shareReferralLink(shareUrl.value || status.value.shareUrl)
  }

  return { status, loading, error, load, claim, share, shareUrl }
}
