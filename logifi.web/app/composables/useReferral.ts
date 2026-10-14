import { computed, ref } from 'vue'
import type { AttributionBlock } from '../../shared/referrals'
import { apiFetch } from '~/utils/apiFetch'
import { shareReferralLink, shareUrlForClient } from '~/utils/referralCapture'
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

const CLAIM_MESSAGES: Record<AttributionBlock, string> = {
  invalid_code: 'Enter a valid code',
  unknown_code: 'Code not found',
  self: "That's your code",
  already_referred: 'Referral already applied',
  paid_purchase: 'Codes can be entered before your first credit purchase',
}

export function useReferral() {
  const status = ref<ReferralStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { getAccessToken } = useAuth()

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
    const result = await apiFetch<ReferralClaimResult>('/api/referrals/claim', {
      method: 'POST',
      headers,
      body: { code },
    })
    await load()
    if (!result.ok && result.reason) return CLAIM_MESSAGES[result.reason]
    if (result.friendCreditsGranted) return '5 credits added'
    if (result.attributed) return 'Referral applied'
    return null
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
