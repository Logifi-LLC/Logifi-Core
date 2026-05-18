<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <p :class="helper">Sign-in email and password for your Logifi account.</p>

    <SettingsSection title="Email" description="This is the email used to sign in." :is-dark-mode="isDarkMode">
      <SettingsField label="Current email" :is-dark-mode="isDarkMode">
        <template #default>
          <div :class="readOnlyField">{{ userEmail || 'Not available' }}</div>
        </template>
      </SettingsField>

      <form class="mt-4 space-y-4" @submit.prevent="$emit('update-email')">
        <SettingsField label="New email" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <input
              v-model="emailModel"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              :class="inputClass"
            />
          </template>
        </SettingsField>
        <div class="flex items-center gap-3">
          <button type="submit" :disabled="isUpdatingEmail" :class="btnPrimary">
            <span v-if="!isUpdatingEmail">Update email</span>
            <span v-else>Updating…</span>
          </button>
          <p v-if="emailSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">{{ emailSuccess }}</p>
          <p v-else-if="emailError" class="text-sm text-red-600 dark:text-red-400">{{ emailError }}</p>
        </div>
      </form>
    </SettingsSection>

    <SettingsSection title="Password" description="Use at least 8 characters." :is-dark-mode="isDarkMode">
      <form class="space-y-4" @submit.prevent="$emit('update-password')">
        <SettingsField label="Current password" :is-dark-mode="isDarkMode">
          <template #default="{ inputClass }">
            <input v-model="currentPasswordModel" type="password" autocomplete="current-password" :class="inputClass" />
          </template>
        </SettingsField>
        <div class="grid gap-4 sm:grid-cols-2">
          <SettingsField label="New password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input v-model="newPasswordModel" type="password" autocomplete="new-password" :class="inputClass" />
            </template>
          </SettingsField>
          <SettingsField label="Confirm new password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input v-model="confirmPasswordModel" type="password" autocomplete="new-password" :class="inputClass" />
            </template>
          </SettingsField>
        </div>
        <div class="flex items-center gap-3">
          <button type="submit" :disabled="isUpdatingPassword" :class="btnPrimary">
            <span v-if="!isUpdatingPassword">Update password</span>
            <span v-else>Updating…</span>
          </button>
          <p v-if="passwordSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">{{ passwordSuccess }}</p>
          <p v-else-if="passwordError" class="text-sm text-red-600 dark:text-red-400">{{ passwordError }}</p>
        </div>
      </form>
    </SettingsSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SettingsSection from '../SettingsSection.vue'
import SettingsField from '../SettingsField.vue'
import { useSettingsClasses } from '../useSettingsClasses'

const props = defineProps<{
  isDarkMode: boolean
  userEmail?: string | null
  isUpdatingEmail: boolean
  isUpdatingPassword: boolean
  emailSuccess?: string
  emailError?: string
  passwordSuccess?: string
  passwordError?: string
}>()

const emailModel = defineModel<string>('accountEmail', { required: true })
const currentPasswordModel = defineModel<string>('currentPassword', { required: true })
const newPasswordModel = defineModel<string>('newPassword', { required: true })
const confirmPasswordModel = defineModel<string>('confirmNewPassword', { required: true })

defineEmits<{
  'update-email': []
  'update-password': []
}>()

const { helper, readOnlyField, btnPrimary } = useSettingsClasses(computed(() => props.isDarkMode))
</script>
