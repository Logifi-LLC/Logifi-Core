<template>
  <div class="space-y-6">
    <SettingsListGroup title="Display" :is-dark-mode="isDarkMode">
      <div class="divide-y" :class="isDarkMode ? 'divide-gray-700' : 'divide-gray-100'">
        <div class="px-4 py-3">
          <SettingsRow label="Appearance" :is-dark-mode="isDarkMode">
            <SegmentedControl
              :model-value="theme"
              :options="[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]"
              :is-dark-mode="isDarkMode"
              aria-label="Theme"
              @update:model-value="$emit('set-theme', $event as Theme)"
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
          class="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
        >
          <span class="min-w-0">
            <span class="block text-sm font-quicksand" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
              Currency chips
            </span>
            <span class="mt-0.5 block text-xs font-quicksand" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              90-day / night / IFR under totals
            </span>
          </span>
          <input
            type="checkbox"
            :checked="showCurrencyChips"
            class="h-5 w-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            :class="isDarkMode ? 'border-gray-600 bg-gray-800' : 'bg-white'"
            @change="$emit('toggle-currency-chips')"
          />
        </label>
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

    <SettingsLogbookLayoutSection
      :is-dark-mode="isDarkMode"
      :is-ios="isIos"
      :presets="logbookLayoutPresets"
      :active-preset-id="activeLogbookLayoutPresetId"
      :picker-fields="logbookLayoutPickerFields"
      :detail-field-crowded="logbookLayoutDetailCrowded"
      @apply-preset="$emit('apply-logbook-layout-preset', $event)"
      @toggle-field="$emit('toggle-logbook-layout-field', $event)"
      @drag-start="$emit('logbook-layout-drag-start', $event)"
      @drop="$emit('logbook-layout-drop', $event)"
      @move-up="$emit('logbook-layout-move-up', $event)"
      @move-down="$emit('logbook-layout-move-down', $event)"
      @reset="$emit('reset-logbook-layout')"
    />
  </div>
</template>

<script setup lang="ts">
import SettingsRow from '../SettingsRow.vue'
import SegmentedControl from '../SegmentedControl.vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsLogbookLayoutSection from '../SettingsLogbookLayoutSection.vue'
import type { Theme } from '~/composables/useTheme'
import type { LogbookColumnConfig, LogbookColumnKey } from '~/utils/logbookTypes'
import type { EntryCardPreset, EntryCardPresetId } from '~/utils/entryCardPresets'

defineProps<{
  isDarkMode: boolean
  isIos: boolean
  theme: Theme
  clockFormat: '12' | '24'
  clockZone: 'UTC' | 'Local'
  availableMetrics: { key: string; label: string }[]
  selectedMetrics: string[]
  showCurrencyChips: boolean
  logbookLayoutPresets: readonly EntryCardPreset[]
  activeLogbookLayoutPresetId: EntryCardPresetId
  logbookLayoutPickerFields: LogbookColumnConfig[]
  logbookLayoutDetailCrowded: boolean
}>()

defineEmits<{
  'set-theme': [theme: Theme]
  'set-clock-format': [format: '12' | '24']
  'set-clock-zone': [zone: 'UTC' | 'Local']
  'toggle-metric': [key: string]
  'toggle-currency-chips': []
  'apply-logbook-layout-preset': [id: EntryCardPresetId]
  'toggle-logbook-layout-field': [key: LogbookColumnKey]
  'logbook-layout-drag-start': [key: LogbookColumnKey]
  'logbook-layout-drop': [key: LogbookColumnKey]
  'logbook-layout-move-up': [key: LogbookColumnKey]
  'logbook-layout-move-down': [key: LogbookColumnKey]
  'reset-logbook-layout': []
}>()
</script>
