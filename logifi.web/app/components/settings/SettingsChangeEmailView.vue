<template>
  <div class="space-y-6">
    <p :class="helper">{{ helperText }}</p>
    <p
      v-if="isAppleRelayEmail"
      :class="helper"
    >
      This account uses a private Apple relay address. You can switch it to your real email.
    </p>

    <SettingsListGroup :is-dark-mode="isDarkMode">
      <form class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'" @submit.prevent="$emit('submit')">
        <div v-if="requireCurrentPassword" class="px-4 py-3">
          <SettingsField label="Current password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass, inputId }">
              <input
                :id="inputId"
                v-model="currentPasswordModel"
                type="password"
                autocomplete="current-password"
                placeholder="Enter current password"
                :class="[inputClass, 'min-h-11']"
                :aria-invalid="Boolean(passwordFieldError)"
                :aria-describedby="passwordFieldError ? passwordErrorId : undefined"
                @blur="passwordTouched = true"
              />
            </template>
          </SettingsField>
          <p v-if="passwordFieldError" :id="passwordErrorId" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {{ passwordFieldError }}
          </p>
        </div>
        <div class="px-4 py-3">
          <SettingsField label="New email" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass, inputId }">
              <input
                :id="inputId"
                v-model="emailModel"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                :class="[inputClass, 'min-h-11']"
                :aria-invalid="Boolean(emailFieldError)"
                :aria-describedby="emailFieldError ? emailErrorId : undefined"
                @blur="emailTouched = true"
              />
            </template>
          </SettingsField>
          <p v-if="emailFieldError" :id="emailErrorId" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {{ emailFieldError }}
          </p>
        </div>
        <div v-if="needsNonce" class="px-4 py-3">
          <SettingsField label="Confirmation code" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass, inputId }">
              <input
                :id="inputId"
                v-model="nonceModel"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="Code from email"
                :class="[inputClass, 'min-h-11']"
                :aria-invalid="Boolean(nonceFieldError)"
                :aria-describedby="nonceFieldError ? nonceErrorId : undefined"
                @blur="nonceTouched = true"
              />
            </template>
          </SettingsField>
          <p v-if="nonceFieldError" :id="nonceErrorId" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {{ nonceFieldError }}
          </p>
        </div>
        <div class="px-4 py-3">
          <button
            type="submit"
            :disabled="isUpdating"
            :class="[btnPrimary, 'w-full min-h-11']"
          >
            <span v-if="!isUpdating">Update email</span>
            <span v-else>Updating…</span>
          </button>
        </div>
      </form>
    </SettingsListGroup>

    <p v-if="success" class="text-sm text-emerald-600 dark:text-emerald-400">{{ success }}</p>
    <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import SettingsListGroup from './SettingsListGroup.vue'
import SettingsField from './SettingsField.vue'
import { useSettingsClasses } from './useSettingsClasses'
import { isValidEmailFormat } from '~/utils/accountCredentialUpdate'

const props = withDefaults(
  defineProps<{
    isDarkMode: boolean
    isUpdating: boolean
    requireCurrentPassword?: boolean
    isAppleRelayEmail?: boolean
    needsNonce?: boolean
    success?: string | null
    error?: string | null
  }>(),
  {
    requireCurrentPassword: true,
    isAppleRelayEmail: false,
    needsNonce: false,
  }
)

const emailModel = defineModel<string>('accountEmail', { required: true })
const currentPasswordModel = defineModel<string>('currentPassword', { required: true })
const nonceModel = defineModel<string>('reauthNonce', { default: '' })

defineEmits<{
  submit: []
}>()

const { helper, btnPrimary } = useSettingsClasses(computed(() => props.isDarkMode))

const emailTouched = ref(false)
const passwordTouched = ref(false)
const nonceTouched = ref(false)
const emailErrorId = useId()
const passwordErrorId = useId()
const nonceErrorId = useId()

const helperText = computed(() =>
  props.requireCurrentPassword
    ? 'Enter your current password and new email address.'
    : 'Enter your new email. We will send a confirmation link before it changes.'
)

const emailFieldError = computed(() => {
  if (!emailTouched.value) return null
  const value = emailModel.value.trim()
  if (!value) return 'Enter an email address.'
  if (!isValidEmailFormat(value)) return 'Enter a valid email address.'
  return null
})

const passwordFieldError = computed(() => {
  if (!props.requireCurrentPassword || !passwordTouched.value) return null
  if (!currentPasswordModel.value) return 'Enter your current password.'
  return null
})

const nonceFieldError = computed(() => {
  if (!props.needsNonce || !nonceTouched.value) return null
  if (!nonceModel.value.trim()) return 'Enter the confirmation code from your email.'
  return null
})
</script>
