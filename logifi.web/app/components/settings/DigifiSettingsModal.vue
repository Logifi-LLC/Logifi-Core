<template>
  <SettingsStackShell
    :open="open"
    :stack="stack"
    :is-dark-mode="isDarkMode"
    @close="$emit('close')"
    @pop="$emit('pop')"
  >
    <SettingsDigifiRootView
      v-if="currentFrame === 'root'"
      :is-dark-mode="isDarkMode"
      @navigate="$emit('push', $event)"
      @close="$emit('close')"
      @show-directions="$emit('show-directions')"
      @show-common-errors="$emit('show-common-errors')"
    />

    <SettingsInviteTab v-else-if="currentFrame === 'invite'" :is-dark-mode="isDarkMode" />

    <SettingsAccountTab
      v-else-if="currentFrame === 'account'"
      :is-dark-mode="isDarkMode"
      :user-email="userEmail"
      @push-email="$emit('push', 'account-email')"
      @push-password="$emit('push', 'account-password')"
      @account-deleted="$emit('account-deleted')"
    />

    <SettingsDigifiTab
      v-else-if="currentFrame === 'digifi'"
      :is-dark-mode="isDarkMode"
      @close="$emit('close')"
    />

    <SettingsChangeEmailView
      v-else-if="currentFrame === 'account-email'"
      v-model:account-email="accountEmailModel"
      v-model:current-password="currentPasswordModel"
      v-model:reauth-nonce="reauthNonceModel"
      :is-dark-mode="isDarkMode"
      :is-updating="isUpdatingEmail"
      :require-current-password="requireCurrentPassword"
      :is-apple-relay-email="isAppleRelayEmail"
      :needs-nonce="needsNonce"
      :success="emailSuccess"
      :error="emailError"
      @submit="$emit('update-email')"
    />

    <SettingsChangePasswordView
      v-else-if="currentFrame === 'account-password'"
      v-model:current-password="currentPasswordModel"
      v-model:new-password="newPasswordModel"
      v-model:confirm-new-password="confirmPasswordModel"
      v-model:reauth-nonce="reauthNonceModel"
      :is-dark-mode="isDarkMode"
      :is-updating="isUpdatingPassword"
      :require-current-password="requireCurrentPassword"
      :needs-nonce="needsNonce"
      :success="passwordSuccess"
      :error="passwordError"
      @submit="$emit('update-password')"
    />
  </SettingsStackShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SettingsStackShell from './SettingsStackShell.vue'
import SettingsDigifiRootView from './SettingsDigifiRootView.vue'
import SettingsAccountTab from './tabs/SettingsAccountTab.vue'
import SettingsInviteTab from './tabs/SettingsInviteTab.vue'
import SettingsDigifiTab from './tabs/SettingsDigifiTab.vue'
import SettingsChangeEmailView from './SettingsChangeEmailView.vue'
import SettingsChangePasswordView from './SettingsChangePasswordView.vue'

type DigifiSettingsStackFrame = 'root' | 'account' | 'digifi' | 'invite' | 'account-email' | 'account-password'

const props = defineProps<{
  open: boolean
  stack: DigifiSettingsStackFrame[]
  isDarkMode: boolean
  userEmail?: string
  accountEmail: string
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
  isUpdatingEmail: boolean
  isUpdatingPassword: boolean
  emailSuccess?: string | null
  emailError?: string | null
  passwordSuccess?: string | null
  passwordError?: string | null
  requireCurrentPassword?: boolean
  isAppleRelayEmail?: boolean
  needsNonce?: boolean
  reauthNonce?: string
}>()

const emit = defineEmits<{
  close: []
  pop: []
  push: [frame: DigifiSettingsStackFrame]
  'update-email': []
  'update-password': []
  'account-deleted': []
  'show-directions': []
  'show-common-errors': []
}>()

const currentFrame = computed(() => props.stack[props.stack.length - 1] || 'root')

const accountEmailModel = computed({
  get: () => props.accountEmail,
  set: (val) => emit('update:accountEmail' as any, val)
})

const currentPasswordModel = computed({
  get: () => props.currentPassword,
  set: (val) => emit('update:currentPassword' as any, val)
})

const newPasswordModel = computed({
  get: () => props.newPassword,
  set: (val) => emit('update:newPassword' as any, val)
})

const confirmPasswordModel = computed({
  get: () => props.confirmNewPassword,
  set: (val) => emit('update:confirmNewPassword' as any, val)
})

const reauthNonceModel = computed({
  get: () => props.reauthNonce ?? '',
  set: (val) => emit('update:reauthNonce' as any, val)
})
</script>
