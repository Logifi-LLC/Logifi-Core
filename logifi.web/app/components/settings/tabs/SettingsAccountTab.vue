<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <section
      class="rounded-xl border px-4 py-4 sm:px-5"
      :class="isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'"
    >
      <h3 :class="sectionTitle">Account security</h3>
      <p class="mt-1" :class="helper">
        Keep your sign-in details protected. Sensitive updates are hidden until you explicitly start them.
      </p>
    </section>

    <SettingsSection title="Digifi Credits" description="1 credit covers a full spread scan (left + right sides and rescans in the same session)." :is-dark-mode="isDarkMode">
      <div
        class="rounded-xl border p-4"
        :class="isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'"
      >
        <DigifiCreditsIndicator compact @open-checkout="showAddCreditsModal = true" />
        <DigifiCreditHistory :is-dark-mode="isDarkMode" />
      </div>
    </SettingsSection>

    <SettingsSection title="Email" description="This is the email used to sign in." :is-dark-mode="isDarkMode">
      <SettingsField label="Current email" :is-dark-mode="isDarkMode">
        <template #default>
          <div :class="readOnlyField">{{ userEmail || 'Not available' }}</div>
        </template>
      </SettingsField>

      <div v-if="!showEmailForm" class="mt-4">
        <button type="button" :class="btnSecondary" @click="showEmailForm = true">
          Change email
        </button>
      </div>

      <form v-else class="mt-4 space-y-4" @submit.prevent="$emit('update-email')">
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
        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" :disabled="isUpdatingEmail" :class="btnPrimary">
            <span v-if="!isUpdatingEmail">Update email</span>
            <span v-else>Updating…</span>
          </button>
          <button type="button" :class="btnSecondary" @click="cancelEmailChange">
            Cancel
          </button>
        </div>
        <p v-if="emailSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">{{ emailSuccess }}</p>
        <p v-else-if="emailError" class="text-sm text-red-600 dark:text-red-400">{{ emailError }}</p>
      </form>
    </SettingsSection>

    <SettingsSection title="Password" description="Use at least 8 characters." :is-dark-mode="isDarkMode">
      <div v-if="!showPasswordForm" class="mt-1">
        <button type="button" :class="btnSecondary" @click="showPasswordForm = true">
          Change password
        </button>
      </div>

      <form v-else class="mt-4 space-y-4" @submit.prevent="$emit('update-password')">
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
        <div class="grid gap-4 sm:grid-cols-2">
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
        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" :disabled="isUpdatingPassword" :class="btnPrimary">
            <span v-if="!isUpdatingPassword">Update password</span>
            <span v-else>Updating…</span>
          </button>
          <button type="button" :class="btnSecondary" @click="cancelPasswordChange">
            Cancel
          </button>
        </div>
        <p v-if="passwordSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">{{ passwordSuccess }}</p>
        <p v-else-if="passwordError" class="text-sm text-red-600 dark:text-red-400">{{ passwordError }}</p>
      </form>
    </SettingsSection>

    <DigifiAddCreditsModal :is-open="showAddCreditsModal" @close="showAddCreditsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingsSection from '../SettingsSection.vue'
import SettingsField from '../SettingsField.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import DigifiCreditsIndicator from '~/components/digifi/DigifiCreditsIndicator.vue'
import DigifiCreditHistory from '~/components/digifi/DigifiCreditHistory.vue'
import DigifiAddCreditsModal from '~/components/digifi/DigifiAddCreditsModal.vue'

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

const { helper, readOnlyField, btnPrimary, btnSecondary, sectionTitle } = useSettingsClasses(computed(() => props.isDarkMode))
const showAddCreditsModal = ref(false)
const showEmailForm = ref(false)
const showPasswordForm = ref(false)

function cancelEmailChange() {
  showEmailForm.value = false
  emailModel.value = ''
  currentPasswordModel.value = ''
}

function cancelPasswordChange() {
  showPasswordForm.value = false
  currentPasswordModel.value = ''
  newPasswordModel.value = ''
  confirmPasswordModel.value = ''
}
</script>
