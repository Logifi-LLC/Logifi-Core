<template>
  <div class="space-y-6">
    <p :class="helper">Use at least 8 characters for your new password.</p>

    <SettingsListGroup :is-dark-mode="isDarkMode">
      <form class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'" @submit.prevent="$emit('submit')">
        <div class="px-4 py-3">
          <SettingsField label="Current password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input
                v-model="currentPasswordModel"
                type="password"
                autocomplete="current-password"
                placeholder="Enter current password"
                :class="inputClass"
              />
            </template>
          </SettingsField>
        </div>
        <div class="px-4 py-3 space-y-4">
          <SettingsField label="New password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input
                v-model="newPasswordModel"
                type="password"
                autocomplete="new-password"
                placeholder="New password"
                :class="inputClass"
              />
            </template>
          </SettingsField>
          <SettingsField label="Confirm new password" :is-dark-mode="isDarkMode">
            <template #default="{ inputClass }">
              <input
                v-model="confirmPasswordModel"
                type="password"
                autocomplete="new-password"
                placeholder="Confirm password"
                :class="inputClass"
              />
            </template>
          </SettingsField>
        </div>
        <div class="px-4 py-3">
          <button type="submit" :disabled="isUpdating" :class="[btnPrimary, 'w-full']">
            <span v-if="!isUpdating">Update password</span>
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
import { computed } from 'vue'
import SettingsListGroup from './SettingsListGroup.vue'
import SettingsField from './SettingsField.vue'
import { useSettingsClasses } from './useSettingsClasses'

const props = defineProps<{
  isDarkMode: boolean
  isUpdating: boolean
  success?: string
  error?: string
}>()

const currentPasswordModel = defineModel<string>('currentPassword', { required: true })
const newPasswordModel = defineModel<string>('newPassword', { required: true })
const confirmPasswordModel = defineModel<string>('confirmNewPassword', { required: true })

defineEmits<{
  submit: []
}>()

const { helper, btnPrimary } = useSettingsClasses(computed(() => props.isDarkMode))
</script>
