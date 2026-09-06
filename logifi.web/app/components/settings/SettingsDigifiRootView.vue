<template>
  <div class="space-y-6">
    <SettingsListGroup :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Account Settings"
        subtitle="Email, password, delete account"
        icon="ri:shield-user-line"
        :is-dark-mode="isDarkMode"
        @click="$emit('navigate', 'account')"
      />
    </SettingsListGroup>

    <SettingsListGroup
      title="Help"
      :is-dark-mode="isDarkMode"
    >
      <SettingsListRow
        label="Directions"
        subtitle="How to use Digifi"
        icon="ri:compass-line"
        :is-dark-mode="isDarkMode"
        @click="$emit('show-directions')"
      />
      <SettingsListRow
        label="Common Errors"
        subtitle="Typical OCR mistakes"
        icon="ri:error-warning-line"
        :is-dark-mode="isDarkMode"
        @click="$emit('show-common-errors')"
      />
    </SettingsListGroup>

    <SettingsListGroup :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Digifi Settings"
        subtitle="Learning & scanning preferences"
        icon="ri:scan-line"
        :is-dark-mode="isDarkMode"
        @click="$emit('navigate', 'digifi')"
      />
    </SettingsListGroup>

    <SettingsListGroup :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Open Logifi"
        subtitle="Use the Logifi digital logbook"
        icon="ri:book-open-line"
        :is-dark-mode="isDarkMode"
        tag="NuxtLink"
        to="/dashboard"
        @click="$emit('close')"
      />
    </SettingsListGroup>
  </div>
</template>

<script setup lang="ts">
import SettingsListGroup from './SettingsListGroup.vue'
import SettingsListRow from './SettingsListRow.vue'

defineProps<{
  isDarkMode: boolean
}>()

defineEmits<{
  navigate: [tab: 'account' | 'digifi']
  close: []
  'show-directions': []
  'show-common-errors': []
}>()
</script>
