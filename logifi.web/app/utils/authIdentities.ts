export const APPLE_PRIVATE_RELAY_DOMAIN = 'privaterelay.appleid.com'

export type AuthIdentityLike = {
  provider?: string | null
  identity_data?: Record<string, unknown> | null
}

export function identityProvider(identity: AuthIdentityLike | null | undefined): string {
  return (identity?.provider ?? '').trim().toLowerCase()
}

export function listIdentityProviders(
  identities: AuthIdentityLike[] | null | undefined
): string[] {
  return (identities ?? []).map(identityProvider).filter(Boolean)
}

export function hasEmailIdentity(identities: AuthIdentityLike[] | null | undefined): boolean {
  return listIdentityProviders(identities).includes('email')
}

export function isAppleOnlyIdentities(
  identities: AuthIdentityLike[] | null | undefined
): boolean {
  const providers = listIdentityProviders(identities)
  return providers.length > 0 && providers.every((provider) => provider === 'apple')
}

export function isGoogleOnlyIdentities(
  identities: AuthIdentityLike[] | null | undefined
): boolean {
  const providers = listIdentityProviders(identities)
  return providers.length > 0 && providers.every((provider) => provider === 'google')
}

/**
 * Password re-auth is required when this account already has an email identity.
 * `app_metadata.providers` is a fail-closed fallback if `identities` is stale.
 */
export function shouldRequireCurrentPassword(
  identities: AuthIdentityLike[] | null | undefined,
  extra?: { providers?: string[] | null }
): boolean {
  if (hasEmailIdentity(identities)) return true
  const providers = (extra?.providers ?? []).map((p) => p.trim().toLowerCase())
  return providers.includes('email')
}

export function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.split('@')[1]?.trim().toLowerCase()
  return domain === APPLE_PRIVATE_RELAY_DOMAIN
}

export function canUnlinkIdentity(identities: AuthIdentityLike[] | null | undefined): boolean {
  return (identities ?? []).length > 1
}

export const LAST_IDENTITY_GUARD_MESSAGE = 'Keep at least one sign-in method.'

export function assertCanUnlinkIdentity(
  identities: AuthIdentityLike[] | null | undefined
): { ok: true } | { ok: false; error: string } {
  if (!canUnlinkIdentity(identities)) {
    return { ok: false, error: LAST_IDENTITY_GUARD_MESSAGE }
  }
  return { ok: true }
}

export function identityEmail(identity: AuthIdentityLike | null | undefined): string | null {
  const data = identity?.identity_data
  const email = data && typeof data.email === 'string' ? data.email.trim() : ''
  return email || null
}

export function providerLabel(provider: string): string {
  switch (provider.trim().toLowerCase()) {
    case 'email':
      return 'Email'
    case 'google':
      return 'Google'
    case 'apple':
      return 'Apple'
    default:
      return provider
  }
}
