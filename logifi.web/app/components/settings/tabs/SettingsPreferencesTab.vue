<template>
  <div class="space-y-6">
    <SettingsListGroup title="Display" :is-dark-mode="isDarkMode">
      <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
        <div class="px-4 py-3">
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
        </div>
        <div class="px-4 py-3">
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
        </div>
        <div class="px-4 py-3">
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
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Totals overview" :is-dark-mode="isDarkMode">
      <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
        <label
          v-for="metric in availableMetrics"
          :key="metric.key"
          class="flex items-center justify-between gap-3 px-4 py-3"
          :class="metric.key === 'totalTime' ? 'opacity-60' : 'cursor-pointer'"
        >
          <span class="text-sm font-quicksand" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
            {{ metric.label }}
          </span>
          <input
            type="checkbox"
            :checked="selectedMetrics.includes(metric.key)"
            :disabled="metric.key === 'totalTime'"
            class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            :class="isDarkMode ? 'border-gray-600 bg-gray-800' : 'bg-white'"
            @change="$emit('toggle-metric', metric.key)"
          />
        </label>
      </div>
    </SettingsListGroup>

    <SettingsEntryCardSection
      :is-dark-mode="isDarkMode"
      :presets="entryCardPresets"
      :active-preset-id="activeEntryCardPresetId"
      :picker-fields="entryCardPickerFields"
      :detail-field-crowded="entryCardDetailCrowded"
      @apply-preset="$emit('apply-entry-card-preset', $event)"
      @toggle-field="$emit('toggle-entry-card-field', $event)"
      @drag-start="$emit('entry-card-drag-start', $event)"
      @drop="$emit('entry-card-drop', $event)"
      @move-up="$emit('entry-card-move-up', $event)"
      @move-down="$emit('entry-card-move-down', $event)"
      @reset="$emit('reset-entry-card')"
    />
  </div>
</template>

<script setup lang="ts">
import SettingsRow from '../SettingsRow.vue'
import SegmentedControl from '../SegmentedControl.vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsEntryCardSection from '../SettingsEntryCardSection.vue'
import type { LogbookColumnConfig, LogbookColumnKey } from '~/utils/logbookTypes'
import type { EntryCardPreset, EntryCardPresetId } from '~/utils/entryCardPresets'

defineProps<{
  isDarkMode: boolean
  theme: 'dark' | 'light'
  clockFormat: '12' | '24'
  clockZone: 'UTC' | 'Local'
  availableMetrics: { key: string; label: string }[]
  selectedMetrics: string[]
  entryCardPresets: readonly EntryCardPreset[]
  activeEntryCardPresetId: EntryCardPresetId
  entryCardPickerFields: LogbookColumnConfig[]
  entryCardDetailCrowded: boolean
}>()

defineEmits<{
  'set-theme': [theme: 'dark' | 'light']
  'set-clock-format': [format: '12' | '24']
  'set-clock-zone': [zone: 'UTC' | 'Local']
  'toggle-metric': [key: string]
  'apply-entry-card-preset': [id: EntryCardPresetId]
  'toggle-entry-card-field': [key: LogbookColumnKey]
  'entry-card-drag-start': [key: LogbookColumnKey]
  'entry-card-drop': [key: LogbookColumnKey]
  'entry-card-move-up': [key: LogbookColumnKey]
  'entry-card-move-down': [key: LogbookColumnKey]
  'reset-entry-card': []
}>()
</script>
