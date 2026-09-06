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
      :is-dark-mode="isDarkMode"
      :is-updating="isUpdatingEmail"
      :success="emailSuccess"
      :error="emailError"
      @submit="$emit('update-email')"
    />

    <SettingsChangePasswordView
      v-else-if="currentFrame === 'account-password'"
      v-model:current-password="currentPasswordModel"
      v-model:new-password="newPasswordModel"
      v-model:confirm-new-password="confirmPasswordModel"
      :is-dark-mode="isDarkMode"
      :is-updating="isUpdatingPassword"
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
import SettingsDigifiTab from './tabs/SettingsDigifiTab.vue'
import SettingsChangeEmailView from './SettingsChangeEmailView.vue'
import SettingsChangePasswordView from './SettingsChangePasswordView.vue'

type DigifiSettingsStackFrame = 'root' | 'account' | 'digifi' | 'account-email' | 'account-password'

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
  emailSuccess: string
  emailError: string
  passwordSuccess: string
  passwordError: string
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
</script>
