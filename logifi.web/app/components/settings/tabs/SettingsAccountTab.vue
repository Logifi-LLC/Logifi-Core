<template>
  <div class="space-y-6">
    <SettingsListGroup title="Digifi Credits" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <DigifiCreditsIndicator compact @open-checkout="showAddCreditsModal = true" />
      </div>
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <DigifiCreditHistory :is-dark-mode="isDarkMode" />
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Sign-in" :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Email"
        :value="userEmail || 'Not available'"
        :is-dark-mode="isDarkMode"
        @click="$emit('push-email')"
      />
      <SettingsListRow
        label="Password"
        value="Change"
        :is-dark-mode="isDarkMode"
        @click="$emit('push-password')"
      />
    </SettingsListGroup>

    <DigifiAddCreditsModal :is-open="showAddCreditsModal" @close="showAddCreditsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsListRow from '../SettingsListRow.vue'
import DigifiCreditsIndicator from '~/components/digifi/DigifiCreditsIndicator.vue'
import DigifiCreditHistory from '~/components/digifi/DigifiCreditHistory.vue'
import DigifiAddCreditsModal from '~/components/digifi/DigifiAddCreditsModal.vue'

defineProps<{
  isDarkMode: boolean
  userEmail?: string | null
}>()

defineEmits<{
  'push-email': []
  'push-password': []
}>()

const showAddCreditsModal = ref(false)
</script>
