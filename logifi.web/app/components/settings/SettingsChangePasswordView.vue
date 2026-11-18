<template>
  <div class="space-y-6">
    <p :class="helper">{{ helperText }}</p>

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
                :aria-invalid="Boolean(currentFieldError)"
                :aria-describedby="currentFieldError ? currentErrorId : undefined"
                @blur="currentTouched = true"
              />
            </template>
          </SettingsField>
          <p v-if="currentFieldError" :id="currentErrorId" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {{ currentFieldError }}
          </p>
        </div>
        <div class="px-4 py-3 space-y-4">
          <SettingsField :label="requireCurrentPassword ? 'New password' : 'Password'" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass, inputId }">
              <input
                :id="inputId"
                v-model="newPasswordModel"
                type="password"
                autocomplete="new-password"
                placeholder="New password"
                :class="[inputClass, 'min-h-11']"
                :aria-invalid="Boolean(newFieldError)"
                :aria-describedby="newFieldError ? newErrorId : undefined"
                @blur="newTouched = true"
              />
            </template>
          </SettingsField>
          <p v-if="newFieldError" :id="newErrorId" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {{ newFieldError }}
          </p>
          <SettingsField label="Confirm new password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass, inputId }">
              <input
                :id="inputId"
                v-model="confirmPasswordModel"
                type="password"
                autocomplete="new-password"
                placeholder="Confirm password"
                :class="[inputClass, 'min-h-11']"
                :aria-invalid="Boolean(confirmFieldError)"
                :aria-describedby="confirmFieldError ? confirmErrorId : undefined"
                @blur="confirmTouched = true"
              />
            </template>
          </SettingsField>
          <p v-if="confirmFieldError" :id="confirmErrorId" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {{ confirmFieldError }}
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
            <span v-if="isUpdating">Updating…</span>
            <span v-else-if="requireCurrentPassword">Update password</span>
            <span v-else>Set password</span>
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
import { MIN_PASSWORD_LENGTH } from '~/utils/accountCredentialUpdate'

const props = withDefaults(
  defineProps<{
    isDarkMode: boolean
    isUpdating: boolean
    requireCurrentPassword?: boolean
    needsNonce?: boolean
    success?: string | null
    error?: string | null
  }>(),
  {
    requireCurrentPassword: true,
    needsNonce: false,
  }
)

const currentPasswordModel = defineModel<string>('currentPassword', { required: true })
const newPasswordModel = defineModel<string>('newPassword', { required: true })
const confirmPasswordModel = defineModel<string>('confirmNewPassword', { required: true })
const nonceModel = defineModel<string>('reauthNonce', { default: '' })

defineEmits<{
  submit: []
}>()

const { helper, btnPrimary } = useSettingsClasses(computed(() => props.isDarkMode))

const currentTouched = ref(false)
const newTouched = ref(false)
const confirmTouched = ref(false)
const nonceTouched = ref(false)
const currentErrorId = useId()
const newErrorId = useId()
const confirmErrorId = useId()
const nonceErrorId = useId()

const helperText = computed(() =>
  props.requireCurrentPassword
    ? `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`
    : `Set a password (at least ${MIN_PASSWORD_LENGTH} characters) so you can also sign in with email.`
)

const currentFieldError = computed(() => {
  if (!props.requireCurrentPassword || !currentTouched.value) return null
  if (!currentPasswordModel.value) return 'Enter your current password.'
  return null
})

const newFieldError = computed(() => {
  if (!newTouched.value) return null
  if (!newPasswordModel.value) return 'Enter a new password.'
  if (newPasswordModel.value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
})

const confirmFieldError = computed(() => {
  if (!confirmTouched.value) return null
  if (confirmPasswordModel.value !== newPasswordModel.value) {
    return 'New password and confirmation do not match.'
  }
  return null
})

const nonceFieldError = computed(() => {
  if (!props.needsNonce || !nonceTouched.value) return null
  if (!nonceModel.value.trim()) return 'Enter the confirmation code from your email.'
  return null
})
</script>
