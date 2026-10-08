/** Disclosure shown once before the first Digifi capture or upload. */
export const DIGIFI_AI_CONSENT_TITLE = 'Digifi uses AI'

export const DIGIFI_AI_CONSENT_BODY =
  'Digifi sends photos of your logbook pages to Google Gemini, an AI service, to read them. You review every entry before anything is imported.'

export const DIGIFI_AI_CONSENT_CONTINUE_LABEL = 'Continue'
export const DIGIFI_AI_CONSENT_DECLINE_LABEL = 'Not now'
export const DIGIFI_AI_CONSENT_PRIVACY_PATH = '/privacy'
export const DIGIFI_AI_CONSENT_TERMS_PATH = '/terms'

/**
 * About Digifi accuracy line. Same wording on every platform, including iOS.
 * Do not rewrite this copy.
 */
export const DIGIFI_AI_VERIFY_LINE =
  'Digifi uses AI to pre-fill rows from photos of your paper logbook pages on Start Scanning. You are responsible for verifying every entry before importing into your logbook.'

export const DIGIFI_AI_CONSENT_STORAGE_PREFIX = 'logifi-digifi-ai-consent'

export function digifiAiConsentStorageKey(userId: string | null | undefined): string {
  const scope = userId?.trim() ? userId.trim() : 'device'
  return `${DIGIFI_AI_CONSENT_STORAGE_PREFIX}:${scope}`
}

export function readStoredDigifiAiConsent(
  storage: Pick<Storage, 'getItem'>,
  userId: string | null | undefined
): string | null {
  const raw = storage.getItem(digifiAiConsentStorageKey(userId))
  const trimmed = raw?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

export function writeStoredDigifiAiConsent(
  storage: Pick<Storage, 'setItem'>,
  userId: string | null | undefined,
  acceptedAt: string
): void {
  storage.setItem(digifiAiConsentStorageKey(userId), acceptedAt)
}

export function hasAcceptedDigifiAiConsent(sources: {
  profileAcceptedAt?: string | null
  localAcceptedAt?: string | null
  preferencesAcceptedAt?: string | null
}): boolean {
  return [sources.profileAcceptedAt, sources.localAcceptedAt, sources.preferencesAcceptedAt].some(
    (value) => typeof value === 'string' && value.trim().length > 0
  )
}
