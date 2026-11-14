/** Detect Supabase sign-in errors when the address is not verified yet. */
export function isEmailNotConfirmedError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('email not confirmed') ||
    normalized.includes('email not verified') ||
    normalized.includes('not confirmed')
  )
}

export function signInErrorUserMessage(message: string): string {
  if (isEmailNotConfirmedError(message)) {
    return 'Email not confirmed. Check your inbox for the verification link, or resend it below.'
  }
  return message
}

/** True when Supabase throttles auth email sends (reset, confirm, etc.). */
export function isAuthEmailRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('too many') ||
    normalized.includes('once every') ||
    normalized.includes('email rate') ||
    normalized.includes('over_email_send_rate_limit')
  )
}

/** Do not surface these as failures — respond with the same success copy as a real send. */
export function isPasswordResetEnumerationError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('user not found') ||
    normalized.includes('not registered') ||
    normalized.includes('no user found') ||
    normalized.includes('invalid login credentials')
  )
}

export function authEmailRateLimitUserMessage(): string {
  return 'Too many emails sent. Wait a minute, then try resending.'
}

export function passwordResetErrorUserMessage(message: string): string {
  if (isAuthEmailRateLimitError(message)) {
    return authEmailRateLimitUserMessage()
  }
  return message
}
