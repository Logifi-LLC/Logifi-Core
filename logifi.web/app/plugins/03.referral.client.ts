import { watch } from 'vue'
import type { AttributionBlock } from '../../shared/referrals'
import { normalizeReferralCode } from '../../shared/referrals'
import { apiFetch } from '~/utils/apiFetch'
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
  const attempted = new Set<string>()

  watch(
    [user, session],
    async () => {
      const id = user.value?.id
      const token = session.value?.access_token
      if (!id || !token || attempted.has(id)) return
      attempted.add(id)
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
      } catch {
        attempted.delete(id)
      }
    },
    { immediate: true }
  )
})
