import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { supabase } from '~/lib/supabase'
import {
  DIGIFI_AI_CONSENT_BODY,
  DIGIFI_AI_CONSENT_CONTINUE_LABEL,
  DIGIFI_AI_CONSENT_DECLINE_LABEL,
  DIGIFI_AI_CONSENT_TITLE,
  DIGIFI_AI_VERIFY_LINE,
  digifiAiConsentStorageKey,
  hasAcceptedDigifiAiConsent,
  readStoredDigifiAiConsent,
  writeStoredDigifiAiConsent,
} from '~/utils/digifiAiConsent'
import {
  resetDigifiAiConsentForTests,
  useDigifiAiConsent,
} from '~/composables/useDigifiAiConsent'

const auth = vi.hoisted(() => ({
  user: { value: { id: 'pilot-a' } as { id: string } | null },
}))

const prefs = vi.hoisted(() => ({
  available: false,
  store: new Map<string, string>(),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({ user: auth.user }),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isPluginAvailable: (name: string) => name === 'Preferences' && prefs.available,
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
  registerPlugin: () => ({
    get: async ({ key }: { key: string }) => ({ value: prefs.store.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      prefs.store.set(key, value)
    },
  }),
}))

type ProfileResult = {
  data: { digifi_ai_consent_at: string | null } | null
  error: { message: string } | null
}

function mockProfile(result: ProfileResult, update = vi.fn()) {
  vi.mocked(supabase.from).mockImplementation(() => {
    const chain = {
      select: vi.fn(() => chain),
      update: vi.fn((payload: unknown) => {
        update(payload)
        return chain
      }),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => result),
    }
    return chain as never
  })
  return update
}

describe('digifi AI consent storage', () => {
  beforeEach(() => {
    localStorage.clear()
    prefs.available = false
    prefs.store.clear()
    auth.user.value = { id: 'pilot-a' }
    resetDigifiAiConsentForTests()
    mockProfile({ data: null, error: null })
  })

  it('keeps the disclosure and verify wording stable', () => {
    expect(DIGIFI_AI_CONSENT_TITLE).toBe('Digifi uses AI')
    expect(DIGIFI_AI_CONSENT_BODY).toBe(
      'Digifi sends photos of your logbook pages to Google Gemini, an AI service, to read them. You review every entry before anything is imported.'
    )
    expect(DIGIFI_AI_CONSENT_CONTINUE_LABEL).toBe('Continue')
    expect(DIGIFI_AI_CONSENT_DECLINE_LABEL).toBe('Not now')
    expect(DIGIFI_AI_VERIFY_LINE).toBe(
      'Digifi uses AI to pre-fill rows from photos of your paper logbook pages on Start Scanning. You are responsible for verifying every entry before importing into your logbook.'
    )
  })

  it('stores consent per user and does not treat another user as accepted', () => {
    const storage = localStorage
    writeStoredDigifiAiConsent(storage, 'pilot-a', '2026-10-08T12:00:00.000Z')

    expect(readStoredDigifiAiConsent(storage, 'pilot-a')).toBe('2026-10-08T12:00:00.000Z')
    expect(readStoredDigifiAiConsent(storage, 'pilot-b')).toBeNull()
    expect(digifiAiConsentStorageKey(null)).toBe('logifi-digifi-ai-consent:device')
    expect(
      hasAcceptedDigifiAiConsent({
        localAcceptedAt: readStoredDigifiAiConsent(storage, 'pilot-b'),
      })
    ).toBe(false)
  })

  it('accepts when any store has a timestamp, including after a profile read failure', () => {
    expect(hasAcceptedDigifiAiConsent({})).toBe(false)
    expect(hasAcceptedDigifiAiConsent({ profileAcceptedAt: '  ' })).toBe(false)
    expect(hasAcceptedDigifiAiConsent({ preferencesAcceptedAt: '2026-10-08T00:00:00.000Z' })).toBe(true)
    expect(hasAcceptedDigifiAiConsent({ localAcceptedAt: '2026-10-08T00:00:00.000Z' })).toBe(true)
  })

  it('does not re-ask after Continue, and Not now does not persist', async () => {
    const update = mockProfile({ data: null, error: { message: 'column digifi_ai_consent_at does not exist' } })
    const { ensureDigifiAiConsent, acceptDigifiAiConsent, declineDigifiAiConsent, digifiAiConsentSheetOpen } =
      useDigifiAiConsent()

    const declined = ensureDigifiAiConsent()
    await vi.waitFor(() => {
      expect(digifiAiConsentSheetOpen.value).toBe(true)
    })
    declineDigifiAiConsent()
    await expect(declined).resolves.toBe(false)
    expect(localStorage.getItem(digifiAiConsentStorageKey('pilot-a'))).toBeNull()
    expect(update).not.toHaveBeenCalled()

    const pending = ensureDigifiAiConsent()
    await vi.waitFor(() => {
      expect(digifiAiConsentSheetOpen.value).toBe(true)
    })
    await acceptDigifiAiConsent()
    await expect(pending).resolves.toBe(true)
    expect(digifiAiConsentSheetOpen.value).toBe(false)
    expect(localStorage.getItem(digifiAiConsentStorageKey('pilot-a'))).toBeTruthy()
    expect(update).toHaveBeenCalled()

    resetDigifiAiConsentForTests()
    mockProfile({ data: null, error: { message: 'column digifi_ai_consent_at does not exist' } })
    const { ensureDigifiAiConsent: ensureAgain, digifiAiConsentSheetOpen: sheetAgain } = useDigifiAiConsent()
    await expect(ensureAgain()).resolves.toBe(true)
    expect(sheetAgain.value).toBe(false)
  })

  it('uses the profile timestamp without prompting, and keeps other users separate', async () => {
    mockProfile({ data: { digifi_ai_consent_at: '2026-10-08T15:00:00.000Z' }, error: null })
    const { ensureDigifiAiConsent, digifiAiConsentSheetOpen } = useDigifiAiConsent()
    await expect(ensureDigifiAiConsent()).resolves.toBe(true)
    expect(digifiAiConsentSheetOpen.value).toBe(false)
    expect(localStorage.getItem(digifiAiConsentStorageKey('pilot-a'))).toBe('2026-10-08T15:00:00.000Z')

    resetDigifiAiConsentForTests()
    auth.user.value = { id: 'pilot-b' }
    mockProfile({ data: { digifi_ai_consent_at: null }, error: null })
    const other = useDigifiAiConsent()
    const pending = other.ensureDigifiAiConsent()
    await vi.waitFor(() => {
      expect(other.digifiAiConsentSheetOpen.value).toBe(true)
    })
    other.declineDigifiAiConsent()
    await expect(pending).resolves.toBe(false)
  })

  it('honors Capacitor Preferences when the profile column is unavailable', async () => {
    prefs.available = true
    prefs.store.set(digifiAiConsentStorageKey('pilot-a'), '2026-10-08T16:00:00.000Z')
    mockProfile({ data: null, error: { message: 'column digifi_ai_consent_at does not exist' } })
    expect(Capacitor.isPluginAvailable('Preferences')).toBe(true)
    expect(typeof registerPlugin).toBe('function')

    const { ensureDigifiAiConsent, digifiAiConsentSheetOpen } = useDigifiAiConsent()
    await expect(ensureDigifiAiConsent()).resolves.toBe(true)
    expect(digifiAiConsentSheetOpen.value).toBe(false)
    expect(localStorage.getItem(digifiAiConsentStorageKey('pilot-a'))).toBe('2026-10-08T16:00:00.000Z')
  })
})
