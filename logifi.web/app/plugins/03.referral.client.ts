import { watch } from 'vue'
import { normalizeReferralCode } from '../../shared/referrals'
import { isAuthEmailVerified } from '~/utils/referralClaimAttempt'
import { claimStoredReferral } from '~/utils/referralClaimClient'
import { captureReferralFromSearch, storeReferralCode } from '~/utils/referralCapture'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { useAuth } from '~/composables/useAuth'

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

  function claimForCurrentUser() {
    const id = user.value?.id
    const token = session.value?.access_token
    if (!id || !token) return
    void claimStoredReferral({
      userId: id,
      token,
      emailVerified: isAuthEmailVerified(user.value),
    })
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
      claimForCurrentUser()
    },
    { immediate: true }
  )
})
