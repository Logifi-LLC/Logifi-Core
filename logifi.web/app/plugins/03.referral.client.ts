import { watch } from 'vue'
import { normalizeReferralCode, referralCodeFromUrl } from '../../shared/referrals'
import { isAuthEmailVerified } from '~/utils/referralClaimAttempt'
import { claimStoredReferral } from '~/utils/referralClaimClient'
import { captureReferralFromSearch, storeReferralCode } from '~/utils/referralCapture'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  const captured = captureReferralFromSearch(window.location.search)
  if (captured) storeReferralCode(captured)

  const router = useRouter()
  const { user, session } = useAuth()
  let lastOpenedUrl = ''

  async function openReferralFromUrl(url: string) {
    const code = referralCodeFromUrl(url)
    if (!code || lastOpenedUrl === url) return
    lastOpenedUrl = url
    storeReferralCode(code)
    if (user.value) {
      await router.replace('/dashboard')
      return
    }
    await router.replace({ path: '/dashboard', query: { ref: code } })
  }

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
        if (launch?.url) await openReferralFromUrl(launch.url)
        await App.addListener('appUrlOpen', (event) => {
          void openReferralFromUrl(event.url)
        })
      } catch {
        // Share links opened in the browser still land in localStorage.
      }
    })()
  }

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
