import { supabase, isSupabaseAvailable } from '~/lib/supabase'
import { buildAuthCallbackUrl } from '~/utils/authRedirectOrigin'

export function isEmailNotConfirmedMessage(message: string): boolean {
  return /email not confirmed/i.test(message)
}

export function friendlyAuthRateLimitMessage(message: string): string | null {
  if (
    /rate limit|too many requests|once every|over_email_send_rate_limit|429/i.test(
      message
    )
  ) {
    return 'Too many emails sent. Wait a minute and try again.'
  }
  return null
}

export function friendlyResendAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '')
  return (
    friendlyAuthRateLimitMessage(message) ??
    (message.trim() || 'Could not resend confirmation email')
  )
}

export function friendlySignInError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '')
  const rateLimited = friendlyAuthRateLimitMessage(message)
  if (rateLimited) return rateLimited
  if (isEmailNotConfirmedMessage(message)) {
    return 'Confirm your email before signing in. Use resend below if you need a new link.'
  }
  return message.trim() || 'Failed to sign in'
}

export async function resendSignupConfirmationEmail(
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = email.trim()
  if (!trimmed) {
    return { success: false, error: 'Enter your email address' }
  }

  if (!isSupabaseAvailable()) {
    return { success: false, error: 'Auth is not configured' }
  }

  try {
    const emailRedirectTo = buildAuthCallbackUrl()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmed,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: friendlyResendAuthError(err) }
  }
}
