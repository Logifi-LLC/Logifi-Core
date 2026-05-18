<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <SettingsSection
      title="Display"
      description="Theme and time settings for the logbook."
      :is-dark-mode="isDarkMode"
    >
      <div class="space-y-5">
        <SettingsRow label="Appearance" :is-dark-mode="isDarkMode">
          <SegmentedControl
            :model-value="theme"
            :options="[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]"
            :is-dark-mode="isDarkMode"
            aria-label="Theme"
            @update:model-value="$emit('set-theme', $event as 'dark' | 'light')"
          />
        </SettingsRow>

        <SettingsRow label="Clock format" :is-dark-mode="isDarkMode">
          <SegmentedControl
            :model-value="clockFormat"
            :options="[
              { value: '24', label: '24-hour' },
              { value: '12', label: '12-hour' },
            ]"
            :is-dark-mode="isDarkMode"
            aria-label="Clock format"
            @update:model-value="$emit('set-clock-format', $event as '12' | '24')"
          />
        </SettingsRow>

        <SettingsRow label="Timezone" :is-dark-mode="isDarkMode">
          <SegmentedControl
            :model-value="clockZone"
            :options="[
              { value: 'UTC', label: 'UTC' },
              { value: 'Local', label: 'Local' },
            ]"
            :is-dark-mode="isDarkMode"
            aria-label="Timezone"
            @update:model-value="$emit('set-clock-zone', $event as 'UTC' | 'Local')"
          />
        </SettingsRow>
      </div>
    </SettingsSection>

    <SettingsSection
      title="Totals overview"
      description="Choose which metrics appear in the main totals bar."
      :is-dark-mode="isDarkMode"
    >
      <ul
        class="max-h-80 divide-y overflow-y-auto rounded-lg border pr-1 custom-scrollbar"
        :class="isDarkMode ? 'border-gray-700 divide-gray-700' : 'border-gray-200 divide-gray-200'"
      >
        <li
          v-for="metric in availableMetrics"
          :key="metric.key"
          class="flex items-center gap-3 px-3 py-2.5"
        >
          <input
            type="checkbox"
            :checked="selectedMetrics.includes(metric.key)"
            :disabled="metric.key === 'totalTime'"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            :class="isDarkMode ? 'border-gray-600 bg-gray-800' : 'bg-white'"
            @change="$emit('toggle-metric', metric.key)"
          />
          <span class="text-sm font-quicksand" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
            {{ metric.label }}
          </span>
        </li>
      </ul>
    </SettingsSection>
  </div>
</template>

<script setup lang="ts">
import SettingsSection from '../SettingsSection.vue'
import SettingsRow from '../SettingsRow.vue'
import SegmentedControl from '../SegmentedControl.vue'

defineProps<{
  isDarkMode: boolean
  theme: 'dark' | 'light'
  clockFormat: '12' | '24'
  clockZone: 'UTC' | 'Local'
  availableMetrics: { key: string; label: string }[]
  selectedMetrics: string[]
}>()

defineEmits<{
  'set-theme': [theme: 'dark' | 'light']
  'set-clock-format': [format: '12' | '24']
  'set-clock-zone': [zone: 'UTC' | 'Local']
  'toggle-metric': [key: string]
}>()
</script>
