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
