import { watch } from 'vue'
import type { AttributionBlock } from '../../shared/referrals'
import { normalizeReferralCode } from '../../shared/referrals'
import { apiFetch } from '~/utils/apiFetch'
import {
  nextClaimAttempt,
  shouldClaimReferral,
  isAuthEmailVerified,
  type ClaimAttempt,
} from '~/utils/referralClaimAttempt'
import {
  captureReferralFromSearch,
  clearStoredReferralCode,
  readStoredReferralCode,
  storeReferralCode,
} from '~/utils/referralCapture'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { useAuth } from '~/composables/useAuth'

interface ReferralClaimResult {
  ok: boolean
  attributed: boolean
  friendCreditsGranted?: boolean
  reason?: AttributionBlock
}

function rememberCodeFromUrl(url: string) {
  try {
    const code = normalizeReferralCode(new URL(url).searchParams.get('ref'))
    if (code) storeReferralCode(code)
  } catch {
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
    const code = captureReferralFromSearch(query)
    if (code) storeReferralCode(code)
  }
}

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  const captured = captureReferralFromSearch(window.location.search)
  if (captured) storeReferralCode(captured)

  const router = useRouter()
  router.afterEach((to) => {
    const raw = to.query.ref
    const value = Array.isArray(raw) ? raw[0] : raw
    const code = normalizeReferralCode(typeof value === 'string' ? value : null)
    if (code) storeReferralCode(code)
  })

  if (isCapacitorNative()) {
    void (async () => {
      try {
        const { App } = await import('@capacitor/app')
        const launch = await App.getLaunchUrl()
        if (launch?.url) rememberCodeFromUrl(launch.url)
        await App.addListener('appUrlOpen', (event) => {
          rememberCodeFromUrl(event.url)
        })
      } catch {
        // Share links opened in the browser still land in localStorage.
      }
    })()
  }

  const { user, session } = useAuth()
  const attempts = new Map<string, ClaimAttempt>()
  const inflight = new Set<string>()

  async function claimStoredCode() {
    const id = user.value?.id
    const token = session.value?.access_token
    if (!id || !token || inflight.has(id)) return
    const emailVerified = isAuthEmailVerified(user.value)
    const previous = attempts.get(id) ?? 'idle'
    if (!shouldClaimReferral(previous, emailVerified)) return
    inflight.add(id)
    const code = readStoredReferralCode()
    try {
      const result = await apiFetch<ReferralClaimResult>('/api/referrals/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: code ? { code } : {},
      })
      if (code && (result.attributed || result.reason)) {
        clearStoredReferralCode()
      }
      attempts.set(
        id,
        nextClaimAttempt({
          emailVerified,
          attributed: result.attributed,
          friendCreditsGranted: Boolean(result.friendCreditsGranted),
        })
      )
    } catch {
      attempts.set(id, previous)
    } finally {
      inflight.delete(id)
    }
    if (user.value?.id === id && shouldClaimReferral(attempts.get(id) ?? 'idle', isAuthEmailVerified(user.value))) {
      await claimStoredCode()
    }
  }

  watch(
    () =>
      [
        user.value?.id ?? '',
        session.value?.access_token ?? '',
        user.value?.email_confirmed_at ?? '',
        user.value?.confirmed_at ?? '',
      ] as const,
    () => {
      void claimStoredCode()
    },
    { immediate: true }
  )
})
