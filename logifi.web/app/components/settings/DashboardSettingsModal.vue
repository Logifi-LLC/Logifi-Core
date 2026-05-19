<template>
  <SettingsModalShell
    :open="open"
    :active-tab="activeTab"
    :is-dark-mode="isDarkMode"
    @close="$emit('close')"
    @logout="$emit('logout')"
    @update:active-tab="$emit('update:activeTab', $event)"
  >
    <SettingsProfileTab
      v-show="activeTab === 'profile'"
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
      v-show="activeTab === 'account'"
      v-model:account-email="accountEmailModel"
      v-model:current-password="currentPasswordModel"
      v-model:new-password="newPasswordModel"
      v-model:confirm-new-password="confirmPasswordModel"
      :is-dark-mode="isDarkMode"
      :user-email="userEmail"
      :is-updating-email="isUpdatingEmail"
      :is-updating-password="isUpdatingPassword"
      :email-success="emailSuccess"
      :email-error="emailError"
      :password-success="passwordSuccess"
      :password-error="passwordError"
      @update-email="$emit('update-email')"
      @update-password="$emit('update-password')"
    />

    <SettingsPreferencesTab
      v-show="activeTab === 'preferences'"
      :is-dark-mode="isDarkMode"
      :theme="theme"
      :clock-format="clockFormat"
      :clock-zone="clockZone"
      :available-metrics="availableMetrics"
      :selected-metrics="selectedMetrics"
      @set-theme="$emit('set-theme', $event)"
      @set-clock-format="$emit('set-clock-format', $event)"
      @set-clock-zone="$emit('set-clock-zone', $event)"
      @toggle-metric="$emit('toggle-metric', $event)"
    />

    <SettingsDataTab
      v-show="activeTab === 'data'"
      :is-dark-mode="isDarkMode"
      :is-online="isOnline"
      :is-syncing="isSyncing"
      :sync-error="!!syncError"
      :sync-status-icon="syncStatusIcon"
      :sync-status-text="syncStatusText"
      :queue-length="queueLength"
      :is-drag-over="isDragOverImport"
      :entry-count="entryCount"
      @retry-sync="$emit('retry-sync')"
      @import-dragover="$emit('import-dragover')"
      @import-dragenter="$emit('import-dragenter')"
      @import-dragleave="$emit('import-dragleave')"
      @import-drop="$emit('import-drop', $event)"
      @browse-csv="$emit('browse-csv')"
      @browse-json="$emit('browse-json')"
      @export-logbook="$emit('export-logbook')"
      @generate-8710="$emit('generate-8710')"
    />

    <SettingsComplianceTab v-show="activeTab === 'compliance'" :is-dark-mode="isDarkMode" />
  </SettingsModalShell>
</template>

<script setup lang="ts">
import SettingsModalShell from './SettingsModalShell.vue'
import SettingsProfileTab, { type PilotProfileForm } from './tabs/SettingsProfileTab.vue'
import SettingsAccountTab from './tabs/SettingsAccountTab.vue'
import SettingsPreferencesTab from './tabs/SettingsPreferencesTab.vue'
import SettingsDataTab from './tabs/SettingsDataTab.vue'
import SettingsComplianceTab from './tabs/SettingsComplianceTab.vue'
import type { SettingsTabId } from './settingsNav'

defineOptions({ inheritAttrs: false })

defineProps<{
  open: boolean
  activeTab: SettingsTabId
  isDarkMode: boolean
  profile: PilotProfileForm
  initials: string
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
  isOnline: boolean
  isSyncing: boolean
  syncError: unknown
  syncStatusIcon: string
  syncStatusText: string
  queueLength: number
  isDragOverImport: boolean
  entryCount: number
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
  'update:activeTab': [tab: SettingsTabId]
  'open-currency': []
  'update-email': []
  'update-password': []
  'set-theme': [theme: 'dark' | 'light']
  'set-clock-format': [format: '12' | '24']
  'set-clock-zone': [zone: 'UTC' | 'Local']
  'toggle-metric': [key: string]
  'retry-sync': []
  'import-dragover': []
  'import-dragenter': []
  'import-dragleave': []
  'import-drop': [event: DragEvent]
  'browse-csv': []
  'browse-json': []
  'export-logbook': []
  'generate-8710': []
}>()
</script>
