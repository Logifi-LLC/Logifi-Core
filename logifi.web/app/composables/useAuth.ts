import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '~/lib/supabase'

// Shared state across all instances of useAuth
const globalUser = ref<User | null>(null)
const globalSession = ref<Session | null>(null)
const globalIsLoading = ref(true)
const globalError = ref<string | null>(null)
const isPasswordRecoverySession = ref(false)
let authInitialized = false
let authStateSubscription: { unsubscribe: () => void } | null = null

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
      isLoading.value = true
      error.value = null

      // Subscribe before getSession() so PASSWORD_RECOVERY (fired after URL parse) is never missed.
      if (!authStateSubscription) {
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
              console.log('User signed out')
              isPasswordRecoverySession.value = false
              user.value = null
              session.value = null
              return
            }

            session.value = newSession
            user.value = newSession?.user ?? null

            if (event === 'TOKEN_REFRESHED') {
              console.log('Token refreshed successfully')
            }
          }
        )
        authStateSubscription = subscription
      }

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      session.value = currentSession
      user.value = currentSession?.user ?? null

      authInitialized = true
    } catch (err) {
      console.error('Error initializing auth:', err)
      error.value = err instanceof Error ? err.message : 'Failed to initialize authentication'
      user.value = null
      session.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Sign up new user
  const signUp = async (email: string, password: string) => {
    try {
      isLoading.value = true
      error.value = null

      // Confirmation emails must redirect here so detectSessionInUrl can persist the session.
      // Add this URL (and localhost) under Supabase → Authentication → URL Configuration → Redirect URLs.
      const emailRedirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
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
        user.value = data.user
        session.value = data.session
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
    try {
      isLoading.value = true
      error.value = null

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
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with Google (OAuth)
  const signInWithGoogle = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Build redirect URL to the auth callback route
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined

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

  // Send password reset email
  const resetPassword = async (email: string) => {
    try {
      isLoading.value = true
      error.value = null

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined

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
        session.value = data.session
        user.value = data.session.user
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
    signInWithGoogle,
    resetPassword,
    completePasswordReset,
    refreshSession,
    initAuth,
  }
}

