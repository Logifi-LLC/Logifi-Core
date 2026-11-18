import {
  shouldRequireCurrentPassword,
  type AuthIdentityLike,
} from './authIdentities'

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_PATTERN = /\S+@\S+\.\S+/

export type AccountAuthError = { message: string }

export type AccountAuthClient = {
  signInWithPassword: (args: {
    email: string
    password: string
  }) => Promise<{ error: AccountAuthError | null }>
  refreshSession: () => Promise<{ error: AccountAuthError | null }>
  reauthenticate: () => Promise<{ error: AccountAuthError | null }>
  updateUser: (attrs: {
    email?: string
    password?: string
    nonce?: string
  }) => Promise<{ data: { user?: unknown } | null; error: AccountAuthError | null }>
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function isReauthenticationRequiredError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('reauthenticate') ||
    lower.includes('reauthentication') ||
    lower.includes('re-auth') ||
    lower.includes('reauth') ||
    lower.includes('nonce') ||
    lower.includes('insufficient_aal') ||
    lower.includes('aal2')
  )
}

export function mapPasswordVerifyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Current password is incorrect.'
  }
  if (lower.includes('session') || isReauthenticationRequiredError(message)) {
    return 'Your session has expired. Please sign out and sign back in, then try again.'
  }
  return message || 'Unable to verify current password.'
}

export function mapEmailUpdateError(message: string): string {
  const lower = message.toLowerCase()
  if (isReauthenticationRequiredError(message) || lower.includes('session')) {
    return 'Your session has expired. Please sign out and sign back in, then try again.'
  }
  if (lower.includes('invalid email')) {
    return 'Please enter a valid email address.'
  }
  if (lower.includes('error sending email change email')) {
    return 'We could not send the email change confirmation. Please try again in a moment or contact support if this continues.'
  }
  return message || 'Unable to update email.'
}

export function mapPasswordUpdateError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('weak password') || lower.includes('password should')) {
    return `Please choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters and hard to guess).`
  }
  if (isReauthenticationRequiredError(message) || lower.includes('session')) {
    return 'Your session has expired. Please sign out and sign back in, then try again.'
  }
  return message || 'Unable to update password.'
}

export function validateEmailChangeInput(input: {
  nextEmail: string
  currentEmail?: string | null
}): { ok: true; email: string } | { ok: false; error: string } {
  const email = input.nextEmail.trim()
  if (!email) return { ok: false, error: 'Please enter an email address.' }
  if (!isValidEmailFormat(email)) return { ok: false, error: 'Please enter a valid email address.' }
  if (input.currentEmail && input.currentEmail === email) {
    return { ok: false, error: 'That is already your current email.' }
  }
  return { ok: true, email }
}

export function validatePasswordChangeInput(input: {
  newPassword: string
  confirmPassword: string
}): { ok: true } | { ok: false; error: string } {
  if (!input.newPassword) return { ok: false, error: 'Please enter a new password.' }
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    }
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, error: 'New password and confirmation do not match.' }
  }
  return { ok: true }
}

export type AccountChangeVerifyResult =
  | { ok: true; nonce?: string }
  | { ok: false; error: string; needsNonce?: boolean }

/**
 * Password users re-auth with the current password.
 * OAuth-only users use a refreshed session, or a reauthenticate() nonce if Auth requires it.
 */
export async function ensureAccountChangeVerified(
  auth: Pick<AccountAuthClient, 'signInWithPassword' | 'refreshSession' | 'reauthenticate'>,
  input: {
    identities?: AuthIdentityLike[] | null
    providers?: string[] | null
    currentPassword: string
    nonce: string
    userEmail?: string | null
  }
): Promise<AccountChangeVerifyResult> {
  const requirePassword = shouldRequireCurrentPassword(input.identities, {
    providers: input.providers,
  })
  const nonce = input.nonce.trim()

  if (requirePassword) {
    if (!input.currentPassword) {
      return { ok: false, error: 'Please enter your current password.' }
    }
    if (!input.userEmail) {
      return { ok: false, error: 'You must be signed in to change this.' }
    }
    const { error } = await auth.signInWithPassword({
      email: input.userEmail,
      password: input.currentPassword,
    })
    if (error) {
      return { ok: false, error: mapPasswordVerifyError(error.message) }
    }
    return { ok: true }
  }

  if (nonce) {
    return { ok: true, nonce }
  }

  const { error: refreshError } = await auth.refreshSession()
  if (!refreshError) {
    return { ok: true }
  }

  const { error: reauthError } = await auth.reauthenticate()
  if (reauthError) {
    return { ok: false, error: mapPasswordVerifyError(reauthError.message) }
  }
  return {
    ok: false,
    needsNonce: true,
    error: 'Enter the confirmation code we just sent to your current email.',
  }
}

export async function requestReauthNonce(
  auth: Pick<AccountAuthClient, 'reauthenticate'>
): Promise<AccountChangeVerifyResult> {
  const { error } = await auth.reauthenticate()
  if (error) {
    return { ok: false, error: mapPasswordVerifyError(error.message) }
  }
  return {
    ok: false,
    needsNonce: true,
    error: 'Enter the confirmation code we just sent to your current email.',
  }
}
