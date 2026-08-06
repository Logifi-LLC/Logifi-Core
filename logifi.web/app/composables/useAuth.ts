import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseAvailable } from '~/lib/supabase'
import {
  readBestCachedSession,
  readCachedSupabaseSession,
  readOfflineSessionSnapshot,
  writeOfflineSessionSnapshot,
  clearOfflineSessionSnapshot,
} from '~/utils/cachedSupabaseSession'
import { withTimeout } from '~/utils/promiseTimeout'
import {
  buildAuthCallbackUrl,
  buildResetPasswordUrl,
} from '~/utils/authRedirectOrigin'
import { isCapacitorIos } from './useCapacitorPlatform'
import { useOffline } from './useOffline'

function isAppleSignInCancellation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as {
    code?: string | number
    message?: string
    errorMessage?: string
  }
  const code = String(anyErr.code ?? '')
  const message = `${anyErr.message ?? ''} ${anyErr.errorMessage ?? ''}`.toLowerCase()
  return (
    code === '1001' ||
    code === 'ERR_CANCELED' ||
    code === 'USER_CANCELLED' ||
    message.includes('cancel') ||
    message.includes('canceled') ||
    message.includes('cancelled')
  )
}

// Shared state across all instances of useAuth
const globalUser = ref<User | null>(null)
const globalSession = ref<Session | null>(null)
const globalIsLoading = ref(true)
const globalError = ref<string | null>(null)
const isPasswordRecoverySession = ref(false)
let authInitialized = false
let authStateSubscription: { unsubscribe: () => void } | null = null
/** True while an explicit user-initiated signOut is in flight. */
let explicitSignOutInProgress = false

function browserReportsOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function shouldRetainSessionOffline(): boolean {
  if (explicitSignOutInProgress) return false
  if (browserReportsOffline()) return true
  try {
    const { isOnline, connectivityReady } = useOffline()
    if (!connectivityReady.value) return true
    return !isOnline.value
  } catch {
    return browserReportsOffline()
  }
}

function applySession(next: Session | null) {
  globalSession.value = next
  globalUser.value = next?.user ?? null
  if (next?.access_token && next.refresh_token) {
    writeOfflineSessionSnapshot(next)
  }
}

function retainOfflineSession(reason: string): boolean {
  if (!shouldRetainSessionOffline()) return false

  const snapshot =
    globalSession.value ??
    readOfflineSessionSnapshot() ??
    readCachedSupabaseSession() ??
    readBestCachedSession()

  if (!snapshot?.user || !snapshot.access_token) {
    return false
  }

  console.warn(`[useAuth] Retaining offline session after ${reason}`)
  globalSession.value = snapshot
  globalUser.value = snapshot.user
  writeOfflineSessionSnapshot(snapshot)
  return true
}

if (typeof window !== 'undefined') {
  try {
    const cachedSession = readBestCachedSession()
    if (cachedSession) {
      globalSession.value = cachedSession
      globalUser.value = cachedSession.user ?? null
      globalIsLoading.value = false
    }
  } catch (err) {
    console.warn('[useAuth] Failed to hydrate cached session at startup:', err)
  }
}

export const useAuth = () => {
  const user = globalUser
  const session = globalSession
  const isLoading = globalIsLoading
  const error = globalError

  const getAccessToken = () => {
    const token = session.value?.access_token
    return typeof token === 'string' ? token.trim() : ''
  }

  // Check if user is authenticated and has a usable bearer token.
  const hasUsableSession = computed(() => !!user.value && !!session.value && !!getAccessToken())
  const isAuthenticated = hasUsableSession

  // Initialize auth state (only once globally)
  const initAuth = async () => {
    // If already initialized, just return
    if (authInitialized) {
      return
    }

    try {
      error.value = null

      const cachedSession = readBestCachedSession()
      if (cachedSession) {
        session.value = cachedSession
        user.value = cachedSession.user ?? null
        isLoading.value = false
      } else {
        isLoading.value = true
      }

      // Subscribe before getSession() so PASSWORD_RECOVERY (fired after URL parse) is never missed.
      if (isSupabaseAvailable() && !authStateSubscription) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.email)

            if (event === 'PASSWORD_RECOVERY') {
              isPasswordRecoverySession.value = true
            }
            if (event === 'USER_UPDATED') {
              isPasswordRecoverySession.value = false
            }
            if (event === 'SIGNED_OUT') {
              if (retainOfflineSession('SIGNED_OUT')) {
                return
              }
              console.log('User signed out')
              isPasswordRecoverySession.value = false
              user.value = null
              session.value = null
              clearOfflineSessionSnapshot()
              return
            }

            if (!newSession) {
              if (retainOfflineSession(`${event}:null-session`)) {
                return
              }
              session.value = null
              user.value = null
              return
            }

            applySession(newSession)

            if (event === 'TOKEN_REFRESHED') {
              console.log('Token refreshed successfully')
            }
          }
        )
        authStateSubscription = subscription
      }

      if (isSupabaseAvailable()) {
        const { data: { session: currentSession }, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          'Auth getSession'
        )

        if (sessionError) {
          throw sessionError
        }

        if (currentSession) {
          applySession(currentSession)
        } else if (!retainOfflineSession('getSession-null')) {
          session.value = null
          user.value = null
        }
      }

      authInitialized = true
    } catch (err) {
      console.warn('Auth getSession failed; keeping cached session if available:', err)
      error.value = err instanceof Error ? err.message : 'Failed to initialize authentication'

      if (!session.value) {
        const cachedSession = readBestCachedSession()
        if (cachedSession) {
          session.value = cachedSession
          user.value = cachedSession.user ?? null
        } else {
          user.value = null
          session.value = null
        }
      }

      authInitialized = true
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Re-inject app snapshot into the SDK after a wipe, then resume auto-refresh.
   * Call when cloud connectivity returns.
   */
  const restoreSessionAfterReconnect = async (): Promise<boolean> => {
    if (!isSupabaseAvailable()) return false

    try {
      const { data: { session: current } } = await supabase.auth.getSession()
      if (current?.access_token) {
        applySession(current)
        return true
      }

      const snapshot = readOfflineSessionSnapshot() ?? session.value
      if (!snapshot?.access_token || !snapshot.refresh_token) {
        return false
      }

      const { data, error: setError } = await supabase.auth.setSession({
        access_token: snapshot.access_token,
        refresh_token: snapshot.refresh_token,
      })

      if (setError) {
        console.warn('[useAuth] setSession after reconnect failed:', setError.message)
        // Keep offline snapshot for local UX; true sign-out only on explicit logout.
        if (shouldRetainSessionOffline() || browserReportsOffline()) {
          applySession(snapshot)
          return true
        }
        return false
      }

      if (data.session) {
        applySession(data.session)
        return true
      }

      applySession(snapshot)
      return true
    } catch (err) {
      console.warn('[useAuth] restoreSessionAfterReconnect failed:', err)
      return retainOfflineSession('restore-failed')
    }
  }

  // Sign up new user
  const signUp = async (email: string, password: string) => {
    try {
      isLoading.value = true
      error.value = null

      // Confirmation emails must redirect here so detectSessionInUrl can persist the session.
      // Add this URL (and localhost) under Supabase → Authentication → URL Configuration → Redirect URLs.
      const emailRedirectTo = buildAuthCallbackUrl()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user && data.session) {
        applySession(data.session)
      } else if (data.user) {
        user.value = data.user
        session.value = data.session
      }

      const requiresEmailConfirmation = !!data.user && !data.session

      return {
        success: true,
        user: data.user,
        session: data.session,
        requiresEmailConfirmation,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up'
      error.value = errorMessage
      console.error('Sign up error:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Sign in existing user
  const signIn = async (email: string, password: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (data.user && data.session) {
        applySession(data.session)
      }

      return { success: true, user: data.user, session: data.session }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in'
      error.value = errorMessage
      console.error('Sign in error:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Sign out current user
  const signOut = async () => {
    explicitSignOutInProgress = true
    try {
      isLoading.value = true
      error.value = null

      clearOfflineSessionSnapshot()

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      user.value = null
      session.value = null

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out'
      error.value = errorMessage
      console.error('Sign out error:', err)
      // Still clear local state on explicit logout even if network signOut fails.
      user.value = null
      session.value = null
      clearOfflineSessionSnapshot()
      return { success: false, error: errorMessage }
    } finally {
      explicitSignOutInProgress = false
      isLoading.value = false
    }
  }

  /**
   * Permanently delete the current account via server (service-role) then clear local state.
   */
  const deleteAccount = async () => {
    const userId = user.value?.id
    const token = getAccessToken()
    if (!userId || !token) {
      return { success: false as const, error: 'You must be signed in to delete your account' }
    }

    try {
      isLoading.value = true
      error.value = null

      const { apiFetch } = await import('~/utils/apiFetch')
      await apiFetch<{ success: true }>('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      try {
        const { clearAllDataForUser } = await import('~/utils/indexedDB')
        await clearAllDataForUser(userId)
      } catch (localErr) {
        console.warn('[useAuth] Failed to clear local data after account delete:', localErr)
      }

      explicitSignOutInProgress = true
      clearOfflineSessionSnapshot()
      user.value = null
      session.value = null
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Server already deleted the user; local wipe is enough.
      }

      return { success: true as const }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete account'
      error.value = errorMessage
      console.error('Delete account error:', err)
      return { success: false as const, error: errorMessage }
    } finally {
      explicitSignOutInProgress = false
      isLoading.value = false
    }
  }

  // Sign in with Google (OAuth)
  const signInWithGoogle = async () => {
    try {
      isLoading.value = true
      error.value = null

      const redirectTo = buildAuthCallbackUrl()

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (oauthError) {
        throw oauthError
      }

      // On success, Supabase will redirect using the configured Site URL / redirect URL.
      // The /auth/callback route handles the post-login flow.
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google'
      error.value = errorMessage
      console.error('Google sign-in error:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Sign in with Apple.
   * iOS Capacitor: native ASAuthorization → signInWithIdToken.
   * Web (and other platforms): Supabase OAuth (requires Services ID in Supabase).
   */
  const signInWithApple = async () => {
    try {
      isLoading.value = true
      error.value = null

      if (isCapacitorIos()) {
        const { SocialLogin } = await import('@capgo/capacitor-social-login')
        await SocialLogin.initialize({ apple: {} })
        const response = await SocialLogin.login({
          provider: 'apple',
          options: {},
        })
        const idToken = response.result?.idToken
        if (!idToken) {
          throw new Error('Apple Sign In did not return an identity token')
        }

        const { data, error: idTokenError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        })

        if (idTokenError) {
          throw idTokenError
        }

        if (data.session) {
          applySession(data.session)
        }

        return { success: true as const }
      }

      const redirectTo = buildAuthCallbackUrl()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
        },
      })

      if (oauthError) {
        throw oauthError
      }

      return { success: true as const }
    } catch (err) {
      if (isAppleSignInCancellation(err)) {
        return { success: false as const, error: undefined, cancelled: true as const }
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Apple'
      error.value = errorMessage
      console.error('Apple sign-in error:', err)
      return { success: false as const, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Send password reset email
  const resetPassword = async (email: string) => {
    try {
      isLoading.value = true
      error.value = null

      const redirectTo = buildResetPasswordUrl()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        throw resetError
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email'
      error.value = errorMessage
      console.error('Reset password error:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  const completePasswordReset = async (password: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      isPasswordRecoverySession.value = false
      if (data.user) {
        user.value = data.user
      }

      return { success: true as const, user: data.user }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update password'
      error.value = errorMessage
      console.error('Complete password reset error:', err)
      return { success: false as const, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        throw refreshError
      }

      if (data.session) {
        applySession(data.session)
      }

      return { success: true, session: data.session }
    } catch (err) {
      console.error('Session refresh error:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to refresh session' }
    }
  }

  return {
    user,
    session,
    isLoading,
    error,
    isAuthenticated,
    hasUsableSession,
    getAccessToken,
    isPasswordRecoverySession,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
    completePasswordReset,
    refreshSession,
    restoreSessionAfterReconnect,
    initAuth,
  }
}

/** Test-only: reset module singletons between vitest cases. */
export function __resetAuthForTests() {
  if (authStateSubscription) {
    authStateSubscription.unsubscribe()
    authStateSubscription = null
  }
  authInitialized = false
  explicitSignOutInProgress = false
  isPasswordRecoverySession.value = false
  globalUser.value = null
  globalSession.value = null
  globalIsLoading.value = true
  globalError.value = null
}
