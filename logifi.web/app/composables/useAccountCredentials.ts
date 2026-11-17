import { computed, ref, watch } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import {
  isApplePrivateRelayEmail,
  shouldRequireCurrentPassword,
  type AuthIdentityLike,
} from '~/utils/authIdentities'
import {
  ensureAccountChangeVerified,
  isReauthenticationRequiredError,
  mapEmailUpdateError,
  mapPasswordUpdateError,
  requestReauthNonce,
  validateEmailChangeInput,
  validatePasswordChangeInput,
  type AccountAuthClient,
} from '~/utils/accountCredentialUpdate'

function authClient(): AccountAuthClient {
  return {
    signInWithPassword: (args) => supabase.auth.signInWithPassword(args),
    refreshSession: () => supabase.auth.refreshSession(),
    reauthenticate: () => supabase.auth.reauthenticate(),
    updateUser: (attrs) => supabase.auth.updateUser(attrs),
  }
}

export function useAccountCredentials() {
  const { user } = useAuth()

  const accountEmail = ref(user.value?.email ?? '')
  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmNewPassword = ref('')
  const reauthNonce = ref('')
  const needsNonce = ref(false)

  const isUpdatingEmail = ref(false)
  const emailErrorMessage = ref<string | null>(null)
  const emailSuccessMessage = ref<string | null>(null)

  const isUpdatingPassword = ref(false)
  const passwordErrorMessage = ref<string | null>(null)
  const passwordSuccessMessage = ref<string | null>(null)

  const remoteIdentities = ref<AuthIdentityLike[] | null>(null)
  const identities = computed<AuthIdentityLike[]>(
    () =>
      remoteIdentities.value ??
      ((user.value?.identities as AuthIdentityLike[] | undefined) ?? [])
  )
  const providers = computed(() => user.value?.app_metadata?.providers ?? [])
  const identitiesKnown = computed(() => {
    if (remoteIdentities.value != null) return true
    if ((user.value?.identities?.length ?? 0) > 0) return true
    return (providers.value?.length ?? 0) > 0
  })
  const requireCurrentPassword = computed(() => {
    if (!identitiesKnown.value) return true
    return shouldRequireCurrentPassword(identities.value, { providers: providers.value })
  })
  const isAppleRelayEmail = computed(() => isApplePrivateRelayEmail(user.value?.email))

  async function refreshIdentities() {
    try {
      const { data, error } = await supabase.auth.getUserIdentities()
      if (error) return
      remoteIdentities.value = data?.identities ?? []
    } catch {
      // Keep session identities if the refresh fails.
    }
  }
  void refreshIdentities()

  watch(
    () => user.value?.email,
    (email) => {
      if (email && !accountEmail.value) {
        accountEmail.value = email
      }
    }
  )

  function clearSensitiveFields() {
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    reauthNonce.value = ''
    needsNonce.value = false
  }

  async function handleNonceRequired(assignError: (message: string) => void) {
    const requested = await requestReauthNonce(authClient())
    needsNonce.value = requested.needsNonce === true
    assignError(requested.error ?? 'Enter the confirmation code we just sent to your current email.')
  }

  const handleUpdateEmail = async () => {
    emailErrorMessage.value = null
    emailSuccessMessage.value = null

    const parsed = validateEmailChangeInput({
      nextEmail: accountEmail.value,
      currentEmail: user.value?.email,
    })
    if (!parsed.ok) {
      emailErrorMessage.value = parsed.error
      return
    }

    isUpdatingEmail.value = true
    try {
      const verified = await ensureAccountChangeVerified(authClient(), {
        identities: identities.value,
        providers: providers.value,
        currentPassword: currentPassword.value,
        nonce: reauthNonce.value,
        userEmail: user.value?.email,
      })
      if (!verified.ok) {
        needsNonce.value = verified.needsNonce === true
        emailErrorMessage.value = verified.error
        return
      }

      const nonce = (verified.nonce ?? reauthNonce.value).trim()
      const { data, error } = await supabase.auth.updateUser({
        email: parsed.email,
        ...(nonce ? { nonce } : {}),
      })

      if (error) {
        if (isReauthenticationRequiredError(error.message) && !nonce) {
          await handleNonceRequired((message) => {
            emailErrorMessage.value = message
          })
          return
        }
        emailErrorMessage.value = mapEmailUpdateError(error.message)
        return
      }

      if (data?.user) {
        user.value = data.user
        if (data.user.identities) {
          remoteIdentities.value = data.user.identities
        }
      }

      emailSuccessMessage.value =
        'Check your new email for a confirmation link. Your current email stays until you confirm.'
      currentPassword.value = ''
      reauthNonce.value = ''
      needsNonce.value = false
      accountEmail.value = ''
    } catch (err: unknown) {
      emailErrorMessage.value =
        err instanceof Error ? err.message : 'Unable to update email. Please try again.'
    } finally {
      isUpdatingEmail.value = false
    }
  }

  const handleUpdatePassword = async () => {
    passwordErrorMessage.value = null
    passwordSuccessMessage.value = null

    const parsed = validatePasswordChangeInput({
      newPassword: newPassword.value,
      confirmPassword: confirmNewPassword.value,
    })
    if (!parsed.ok) {
      passwordErrorMessage.value = parsed.error
      return
    }

    if (!user.value) {
      passwordErrorMessage.value = 'You must be signed in to change your password.'
      return
    }

    isUpdatingPassword.value = true
    const hadPasswordIdentity = requireCurrentPassword.value
    try {
      const verified = await ensureAccountChangeVerified(authClient(), {
        identities: identities.value,
        providers: providers.value,
        currentPassword: currentPassword.value,
        nonce: reauthNonce.value,
        userEmail: user.value.email,
      })
      if (!verified.ok) {
        needsNonce.value = verified.needsNonce === true
        passwordErrorMessage.value = verified.error
        return
      }

      const nonce = (verified.nonce ?? reauthNonce.value).trim()
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword.value,
        ...(nonce ? { nonce } : {}),
      })

      if (error) {
        if (isReauthenticationRequiredError(error.message) && !nonce) {
          await handleNonceRequired((message) => {
            passwordErrorMessage.value = message
          })
          return
        }
        passwordErrorMessage.value = mapPasswordUpdateError(error.message)
        return
      }

      if (data?.user) {
        user.value = data.user
        if (data.user.identities) {
          remoteIdentities.value = data.user.identities
        }
      }

      passwordSuccessMessage.value = hadPasswordIdentity
        ? 'Password updated successfully.'
        : 'Password set. You can now sign in with email.'
      clearSensitiveFields()
    } catch (err: unknown) {
      passwordErrorMessage.value =
        err instanceof Error ? err.message : 'Unable to update password. Please try again.'
    } finally {
      isUpdatingPassword.value = false
    }
  }

  return {
    accountEmail,
    currentPassword,
    newPassword,
    confirmNewPassword,
    reauthNonce,
    needsNonce,
    isUpdatingEmail,
    emailErrorMessage,
    emailSuccessMessage,
    isUpdatingPassword,
    passwordErrorMessage,
    passwordSuccessMessage,
    requireCurrentPassword,
    isAppleRelayEmail,
    handleUpdateEmail,
    handleUpdatePassword,
    clearSensitiveFields,
  }
}
