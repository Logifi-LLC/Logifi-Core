import { computed, ref } from 'vue'
import type { UserIdentity } from '@supabase/supabase-js'
import { supabase } from '~/lib/supabase'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { buildAuthCallbackUrl } from '~/utils/authRedirectOrigin'
import { isAppleWebOAuthAvailable } from '~/utils/appleWebSignIn'
import {
  assertCanUnlinkIdentity,
  identityEmail,
  identityProvider,
  providerLabel,
} from '~/utils/authIdentities'

export type LinkedIdentityRow = {
  identity: UserIdentity
  provider: string
  label: string
  email: string | null
}

export function useLinkedIdentities() {
  const identities = ref<UserIdentity[]>([])
  const isLoading = ref(false)
  const isLinking = ref<string | null>(null)
  const isUnlinking = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  const rows = computed<LinkedIdentityRow[]>(() =>
    identities.value.map((identity) => {
      const provider = identityProvider(identity)
      return {
        identity,
        provider,
        label: providerLabel(provider),
        email: identityEmail(identity),
      }
    })
  )

  const connectedProviders = computed(() => new Set(rows.value.map((row) => row.provider)))
  const canUnlinkAny = computed(() => identities.value.length > 1)
  const showAppleConnect = computed(
    () =>
      isAppleWebOAuthAvailable() &&
      !isCapacitorNative() &&
      !connectedProviders.value.has('apple')
  )
  const showGoogleConnect = computed(() => !connectedProviders.value.has('google'))

  async function refreshIdentities() {
    isLoading.value = true
    errorMessage.value = null
    try {
      const { data, error } = await supabase.auth.getUserIdentities()
      if (error) {
        errorMessage.value = error.message || 'Could not load sign-in methods.'
        return
      }
      identities.value = data?.identities ?? []
    } catch (err) {
      errorMessage.value =
        err instanceof Error ? err.message : 'Could not load sign-in methods.'
    } finally {
      isLoading.value = false
    }
  }

  async function linkProvider(provider: 'apple' | 'google') {
    if (provider === 'apple' && !showAppleConnect.value) return

    isLinking.value = provider
    errorMessage.value = null
    successMessage.value = null
    try {
      const redirectTo = buildAuthCallbackUrl()
      const native = isCapacitorNative()
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: native,
        },
      })
      if (error) {
        errorMessage.value = error.message || `Could not connect ${providerLabel(provider)}.`
        return
      }
      if (native) {
        if (!data?.url) {
          errorMessage.value = `Could not connect ${providerLabel(provider)}.`
          return
        }
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url })
      }
    } catch (err) {
      errorMessage.value =
        err instanceof Error ? err.message : `Could not connect ${providerLabel(provider)}.`
    } finally {
      isLinking.value = null
    }
  }

  async function unlink(identity: UserIdentity) {
    const guard = assertCanUnlinkIdentity(identities.value)
    if (!guard.ok) {
      errorMessage.value = guard.error
      return
    }

    isUnlinking.value = identity.identity_id || identity.id
    errorMessage.value = null
    successMessage.value = null
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity)
      if (error) {
        errorMessage.value = error.message || 'Could not unlink this sign-in method.'
        return
      }
      const removedId = identity.identity_id || identity.id
      identities.value = identities.value.filter(
        (item) => (item.identity_id || item.id) !== removedId
      )
      successMessage.value = `${providerLabel(identity.provider)} disconnected.`
    } catch (err) {
      errorMessage.value =
        err instanceof Error ? err.message : 'Could not unlink this sign-in method.'
    } finally {
      isUnlinking.value = null
    }
  }

  return {
    identities,
    rows,
    isLoading,
    isLinking,
    isUnlinking,
    errorMessage,
    successMessage,
    canUnlinkAny,
    showAppleConnect,
    showGoogleConnect,
    refreshIdentities,
    linkProvider,
    unlink,
  }
}
