<template>
  <SettingsStackShell
    :open="open"
    :stack="stack"
    :is-dark-mode="isDarkMode"
    @close="$emit('close')"
    @pop="$emit('pop')"
  >
    <SettingsRootView
      v-if="currentFrame === 'root'"
      :is-dark-mode="isDarkMode"
      :profile-preview="profilePreview"
      :sync-status-text="syncStatusText"
      :updates-badge="updatesBadge"
      @navigate="$emit('push', $event)"
      @close="$emit('close')"
      @logout="$emit('logout')"
    />

    <SettingsProfileTab
      v-else-if="currentFrame === 'profile'"
      :profile="profile"
      v-model:sub-tab="profileSubTabModel"
      v-model:show8710="show8710Model"
      :is-dark-mode="isDarkMode"
      :initials="initials"
      :stat-cards="statCards"
      :stats="profileStats"
      :currency-summary="currencySummary"
      :recent-flights="recentFlights"
      :format-date="formatDate"
      @open-currency="$emit('open-currency')"
    />

    <SettingsAccountTab
      v-else-if="currentFrame === 'account'"
      :is-dark-mode="isDarkMode"
      :user-email="userEmail"
      @push-email="$emit('push', 'account-email')"
      @push-password="$emit('push', 'account-password')"
    />

    <SettingsChangeEmailView
      v-else-if="currentFrame === 'account-email'"
      v-model:account-email="accountEmailModel"
      v-model:current-password="currentPasswordModel"
      :is-dark-mode="isDarkMode"
      :is-updating="isUpdatingEmail"
      :success="emailSuccess"
      :error="emailError"
      @submit="$emit('update-email')"
    />

    <SettingsChangePasswordView
      v-else-if="currentFrame === 'account-password'"
      v-model:current-password="currentPasswordModel"
      v-model:new-password="newPasswordModel"
      v-model:confirm-new-password="confirmPasswordModel"
      :is-dark-mode="isDarkMode"
      :is-updating="isUpdatingPassword"
      :success="passwordSuccess"
      :error="passwordError"
      @submit="$emit('update-password')"
    />

    <SettingsDigifiTab
      v-else-if="currentFrame === 'digifi'"
      :is-dark-mode="isDarkMode"
      @close="$emit('close')"
    />

    <SettingsPreferencesTab
      v-else-if="currentFrame === 'preferences'"
      :is-dark-mode="isDarkMode"
      :is-ios="isIos"
      :theme="theme"
      :clock-format="clockFormat"
      :clock-zone="clockZone"
      :available-metrics="availableMetrics"
      :selected-metrics="selectedMetrics"
      :logbook-layout-presets="logbookLayoutPresets"
      :active-logbook-layout-preset-id="activeLogbookLayoutPresetId"
      :logbook-layout-picker-fields="logbookLayoutPickerFields"
      :logbook-layout-detail-crowded="logbookLayoutDetailCrowded"
      @set-theme="$emit('set-theme', $event)"
      @set-clock-format="$emit('set-clock-format', $event)"
      @set-clock-zone="$emit('set-clock-zone', $event)"
      @toggle-metric="$emit('toggle-metric', $event)"
      @apply-logbook-layout-preset="$emit('apply-logbook-layout-preset', $event)"
      @toggle-logbook-layout-field="$emit('toggle-logbook-layout-field', $event)"
      @logbook-layout-drag-start="$emit('logbook-layout-drag-start', $event)"
      @logbook-layout-drop="$emit('logbook-layout-drop', $event)"
      @logbook-layout-move-up="$emit('logbook-layout-move-up', $event)"
      @logbook-layout-move-down="$emit('logbook-layout-move-down', $event)"
      @reset-logbook-layout="$emit('reset-logbook-layout')"
    />

    <SettingsUpdatesTab
      v-else-if="currentFrame === 'updates'"
      :is-dark-mode="isDarkMode"
    />

    <SettingsDataTab
      v-else-if="currentFrame === 'data'"
      :is-dark-mode="isDarkMode"
      :is-online="isOnline"
      :is-syncing="isSyncing"
      :sync-error="!!syncError"
      :sync-status-icon="syncStatusIcon"
      :sync-status-text="syncStatusText"
      :queue-length="queueLength"
      :is-drag-over="isDragOverImport"
      :entry-count="entryCount"
      :fcv-connected="fcvConnected"
      @retry-sync="$emit('retry-sync')"
      @sync-now="$emit('sync-now')"
      @import-dragover="$emit('import-dragover')"
      @import-dragenter="$emit('import-dragenter')"
      @import-dragleave="$emit('import-dragleave')"
      @import-drop="$emit('import-drop', $event)"
      @import-file="$emit('import-file', $event)"
      @export-logbook="$emit('export-logbook')"
      @generate-8710="$emit('generate-8710')"
      @import-fcv="$emit('import-fcv')"
      @close="$emit('close')"
    />

    <SettingsComplianceTab v-else-if="currentFrame === 'compliance'" :is-dark-mode="isDarkMode" />
  </SettingsStackShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SettingsStackShell from './SettingsStackShell.vue'
import SettingsRootView from './SettingsRootView.vue'
import SettingsChangeEmailView from './SettingsChangeEmailView.vue'
import SettingsChangePasswordView from './SettingsChangePasswordView.vue'
import SettingsProfileTab, { type PilotProfileForm } from './tabs/SettingsProfileTab.vue'
import SettingsAccountTab from './tabs/SettingsAccountTab.vue'
import SettingsDigifiTab from './tabs/SettingsDigifiTab.vue'
import SettingsPreferencesTab from './tabs/SettingsPreferencesTab.vue'
import SettingsUpdatesTab from './tabs/SettingsUpdatesTab.vue'
import SettingsDataTab from './tabs/SettingsDataTab.vue'
import SettingsComplianceTab from './tabs/SettingsComplianceTab.vue'
import type { SettingsStackFrame } from './settingsNav'
import type { LogbookColumnConfig, LogbookColumnKey } from '~/utils/logbookTypes'
import type { EntryCardPreset, EntryCardPresetId } from '~/utils/entryCardPresets'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  open: boolean
  stack: SettingsStackFrame[]
  isDarkMode: boolean
  profile: PilotProfileForm
  initials: string
  profilePreview: { name: string; callsign: string; initials: string }
  statCards: { key: string; label: string; value: string; helper?: string }[]
  profileStats: { favoriteAircraft: string; favoriteRoute: string }
  currencySummary: { label: string; current: boolean; detail: string }[]
  recentFlights: { id: string; date: string; route: string; aircraft: string; hours: string }[]
  formatDate: (date: string) => string
  userEmail?: string | null
  isUpdatingEmail: boolean
  isUpdatingPassword: boolean
  emailSuccess?: string
  emailError?: string
  passwordSuccess?: string
  passwordError?: string
  theme: 'dark' | 'light'
  clockFormat: '12' | '24'
  clockZone: 'UTC' | 'Local'
  availableMetrics: { key: string; label: string }[]
  selectedMetrics: string[]
  isIos: boolean
  logbookLayoutPresets: readonly EntryCardPreset[]
  activeLogbookLayoutPresetId: EntryCardPresetId
  logbookLayoutPickerFields: LogbookColumnConfig[]
  logbookLayoutDetailCrowded: boolean
  isOnline: boolean
  isSyncing: boolean
  syncError: unknown
  syncStatusIcon: string
  syncStatusText: string
  queueLength: number
  isDragOverImport: boolean
  entryCount: number
  updatesBadge?: string
  fcvConnected?: boolean
}>()

const profileSubTabModel = defineModel<'profile' | 'stats'>('profileSubTab', { required: true })
const show8710Model = defineModel<boolean>('show8710', { required: true })
const accountEmailModel = defineModel<string>('accountEmail', { required: true })
const currentPasswordModel = defineModel<string>('currentPassword', { required: true })
const newPasswordModel = defineModel<string>('newPassword', { required: true })
const confirmPasswordModel = defineModel<string>('confirmNewPassword', { required: true })

defineEmits<{
  close: []
  logout: []
  pop: []
  push: [frame: SettingsStackFrame]
  'open-currency': []
  'update-email': []
  'update-password': []
  'set-theme': [theme: 'dark' | 'light']
  'set-clock-format': [format: '12' | '24']
  'set-clock-zone': [zone: 'UTC' | 'Local']
  'toggle-metric': [key: string]
  'apply-logbook-layout-preset': [id: EntryCardPresetId]
  'toggle-logbook-layout-field': [key: LogbookColumnKey]
  'logbook-layout-drag-start': [key: LogbookColumnKey]
  'logbook-layout-drop': [key: LogbookColumnKey]
  'logbook-layout-move-up': [key: LogbookColumnKey]
  'logbook-layout-move-down': [key: LogbookColumnKey]
  'reset-logbook-layout': []
  'retry-sync': []
  'sync-now': []
  'import-dragover': []
  'import-dragenter': []
  'import-dragleave': []
  'import-drop': [event: DragEvent]
  'import-file': [file: File]
  'export-logbook': []
  'generate-8710': []
  'import-fcv': []
}>()

const currentFrame = computed(() => props.stack[props.stack.length - 1] ?? 'root')
</script>
