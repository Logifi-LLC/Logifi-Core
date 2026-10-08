import { ref } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import {
  digifiAiConsentStorageKey,
  hasAcceptedDigifiAiConsent,
  readStoredDigifiAiConsent,
  writeStoredDigifiAiConsent,
} from '~/utils/digifiAiConsent'

type PreferencesPlugin = {
  get(options: { key: string }): Promise<{ value: string | null }>
  set(options: { key: string; value: string }): Promise<void>
}

const sheetOpen = ref(false)
const acceptedScopes = new Set<string>()
let promptPromise: Promise<boolean> | null = null
let promptResolve: ((accepted: boolean) => void) | null = null
let preferencesPlugin: PreferencesPlugin | null | undefined

function scopeId(userId: string | null | undefined): string {
  return userId?.trim() ? userId.trim() : 'device'
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getPreferencesPlugin(): PreferencesPlugin | null {
  if (preferencesPlugin !== undefined) return preferencesPlugin
  try {
    if (
      typeof window === 'undefined' ||
      typeof Capacitor.isPluginAvailable !== 'function' ||
      !Capacitor.isPluginAvailable('Preferences')
    ) {
      preferencesPlugin = null
      return null
    }
    preferencesPlugin = registerPlugin<PreferencesPlugin>('Preferences')
  } catch {
    preferencesPlugin = null
  }
  return preferencesPlugin
}

async function readPreferencesConsent(key: string): Promise<string | null> {
  try {
    const plugin = getPreferencesPlugin()
    if (!plugin) return null
    const { value } = await plugin.get({ key })
    const trimmed = value?.trim() ?? ''
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}

async function writePreferencesConsent(key: string, acceptedAt: string): Promise<void> {
  try {
    const plugin = getPreferencesPlugin()
    if (!plugin) return
    await plugin.set({ key, value: acceptedAt })
  } catch {
    // Native Preferences is optional. localStorage still records consent.
  }
}

async function readProfileConsent(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('digifi_ai_consent_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) return null
    const value = data?.digifi_ai_consent_at
    return typeof value === 'string' && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

async function writeProfileConsent(userId: string, acceptedAt: string): Promise<void> {
  try {
    await supabase
      .from('user_profiles')
      .update({ digifi_ai_consent_at: acceptedAt })
      .eq('id', userId)
  } catch {
    // Migration may not be applied yet. Device storage is the fallback.
  }
}

export function useDigifiAiConsent() {
  const { user } = useAuth()

  function currentUserId(): string | null {
    return user.value?.id ?? null
  }

  async function loadAccepted(): Promise<boolean> {
    const userId = currentUserId()
    const scope = scopeId(userId)
    if (acceptedScopes.has(scope)) return true

    const storage = browserStorage()
    const localAcceptedAt = storage ? readStoredDigifiAiConsent(storage, userId) : null
    const key = digifiAiConsentStorageKey(userId)
    const preferencesAcceptedAt = await readPreferencesConsent(key)
    const profileAcceptedAt = userId ? await readProfileConsent(userId) : null
    const accepted = hasAcceptedDigifiAiConsent({
      profileAcceptedAt,
      localAcceptedAt,
      preferencesAcceptedAt,
    })
    if (!accepted) return false

    acceptedScopes.add(scope)
    const stamp = profileAcceptedAt || localAcceptedAt || preferencesAcceptedAt
    if (stamp && storage && !localAcceptedAt) {
      writeStoredDigifiAiConsent(storage, userId, stamp)
    }
    if (stamp && !preferencesAcceptedAt) {
      void writePreferencesConsent(key, stamp)
    }
    if (userId && stamp && !profileAcceptedAt) {
      void writeProfileConsent(userId, stamp)
    }
    return true
  }

  function openPrompt(): Promise<boolean> {
    if (promptPromise) return promptPromise
    sheetOpen.value = true
    promptPromise = new Promise<boolean>((resolve) => {
      promptResolve = resolve
    })
    return promptPromise
  }

  function finishPrompt(accepted: boolean) {
    sheetOpen.value = false
    const resolve = promptResolve
    promptResolve = null
    promptPromise = null
    resolve?.(accepted)
  }

  async function acceptDigifiAiConsent(): Promise<void> {
    const userId = currentUserId()
    const acceptedAt = new Date().toISOString()
    const storage = browserStorage()
    if (storage) writeStoredDigifiAiConsent(storage, userId, acceptedAt)
    await writePreferencesConsent(digifiAiConsentStorageKey(userId), acceptedAt)
    if (userId) await writeProfileConsent(userId, acceptedAt)
    acceptedScopes.add(scopeId(userId))
    finishPrompt(true)
  }

  function declineDigifiAiConsent() {
    finishPrompt(false)
  }

  /** Resolves true only after this user has accepted. Decline cancels the scan. */
  async function ensureDigifiAiConsent(): Promise<boolean> {
    if (await loadAccepted()) return true
    return openPrompt()
  }

  return {
    digifiAiConsentSheetOpen: sheetOpen,
    ensureDigifiAiConsent,
    acceptDigifiAiConsent,
    declineDigifiAiConsent,
  }
}

export function resetDigifiAiConsentForTests() {
  sheetOpen.value = false
  acceptedScopes.clear()
  promptPromise = null
  promptResolve = null
  preferencesPlugin = undefined
}
