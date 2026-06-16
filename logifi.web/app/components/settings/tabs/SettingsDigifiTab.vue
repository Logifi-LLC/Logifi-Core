<template>
  <div class="space-y-6">
    <SettingsListGroup title="About Digifi" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <p class="text-sm" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
          Digifi uses AI to pre-fill rows from photos of your paper logbook pages on Add Pages.
          You are responsible for verifying every entry before importing into your logbook.
        </p>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Scanner" :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Open Digifi scanner"
        subtitle="Add Pages — upload page photos"
        icon="ri:scan-line"
        to="/logbook-builder?digifi=open"
        :is-dark-mode="isDarkMode"
        @click="$emit('close')"
      />
    </SettingsListGroup>

    <SettingsListGroup title="Credits" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <DigifiCreditsIndicator compact @open-checkout="showAddCreditsModal = true" />
      </div>
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <DigifiCreditHistory :is-dark-mode="isDarkMode" />
      </div>
    </SettingsListGroup>

    <DigifiCommonMistakesPanel :is-dark="isDarkMode" />

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
import DigifiCommonMistakesPanel from '~/components/digifi/DigifiCommonMistakesPanel.vue'

defineProps<{
  isDarkMode: boolean
}>()

defineEmits<{
  close: []
}>()

const showAddCreditsModal = ref(false)
</script>
