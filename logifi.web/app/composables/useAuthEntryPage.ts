import { ref, onMounted } from 'vue'
import { captureReferralFromSearch, storeReferralCode } from '~/utils/referralCapture'

type AuthTab = 'signin' | 'signup'

const ACCOUNT_DELETED_QUERY_KEYS = ['account_deleted', 'deleted'] as const

function readAccountDeletedNotice(query: Record<string, unknown>): string | null {
  for (const key of ACCOUNT_DELETED_QUERY_KEYS) {
    const raw = query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value === '1' || value === 'true') {
      return 'Your account has been deleted.'
    }
  }
  return null
}

/** Shared signup/login route behavior: open AuthModal, redirect authed users to dashboard. */
export function useAuthEntryPage(defaultTab: AuthTab) {
  const route = useRoute()
  const router = useRouter()
  const { isAuthenticated, initAuth } = useAuth()

  const showAuth = ref(false)
  const authTab = ref<AuthTab>(defaultTab)
  const authNotice = ref<string | null>(null)

  onMounted(async () => {
    rememberReferralFromRoute()
    authNotice.value = readAccountDeletedNotice(route.query)

    await initAuth()
    if (isAuthenticated.value) {
      await router.replace('/dashboard')
      return
    }
    showAuth.value = true
  })

  function rememberReferralFromRoute() {
    if (typeof window === 'undefined') return
    const code = captureReferralFromSearch(window.location.search)
    if (code) storeReferralCode(code)
  }

  function handleAuthSuccess() {
    window.location.href = '/dashboard'
  }

  function closeAuth() {
    showAuth.value = false
    void router.replace(defaultTab === 'signup' ? '/' : '/')
  }

  return {
    showAuth,
    authTab,
    authNotice,
    handleAuthSuccess,
    closeAuth,
  }
}
