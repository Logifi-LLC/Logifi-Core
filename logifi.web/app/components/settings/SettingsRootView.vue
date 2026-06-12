<template>
  <div class="space-y-6">
    <SettingsListGroup
      v-if="profilePreview"
      :is-dark-mode="isDarkMode"
    >
      <SettingsListRow
        :label="profilePreview.name || 'Pilot Profile'"
        :subtitle="profilePreviewSubtitle"
        :is-dark-mode="isDarkMode"
        @click="$emit('navigate', 'profile')"
      >
        <template #leading>
          <div
            class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
            :class="isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'"
          >
            {{ profilePreview.initials }}
          </div>
        </template>
      </SettingsListRow>
    </SettingsListGroup>

    <SettingsListGroup
      v-for="group in navGroups"
      :key="group"
      :title="group"
      :is-dark-mode="isDarkMode"
    >
      <SettingsListRow
        v-for="item in itemsForGroup(group)"
        :key="item.id"
        :label="item.label"
        :subtitle="rowSubtitle(item)"
        :icon="item.id === 'profile' && profilePreview ? undefined : item.icon"
        :badge="item.id === 'updates' && updatesBadge ? updatesBadge : undefined"
        :is-dark-mode="isDarkMode"
        @click="$emit('navigate', item.id)"
      />
    </SettingsListGroup>

    <SettingsListGroup :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Developer docs"
        icon="ri:code-s-slash-line"
        :is-dark-mode="isDarkMode"
        tag="NuxtLink"
        to="/developers?from=dashboard"
        @click="$emit('close')"
      />
      <SettingsListRow
        label="Sign out"
        icon="ri:logout-box-line"
        :is-dark-mode="isDarkMode"
        :show-chevron="false"
        destructive
        @click="$emit('logout')"
      />
    </SettingsListGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SettingsListGroup from './SettingsListGroup.vue'
import SettingsListRow from './SettingsListRow.vue'
import {
  SETTINGS_NAV_GROUPS,
  navItemsByGroup,
  type SettingsNavItem,
  type SettingsTabId,
} from './settingsNav'

const props = defineProps<{
  isDarkMode: boolean
  profilePreview?: { name: string; callsign: string; initials: string } | null
  syncStatusText?: string
  updatesBadge?: string | number
}>()

defineEmits<{
  navigate: [tab: SettingsTabId]
  close: []
  logout: []
}>()

const navGroups = SETTINGS_NAV_GROUPS

const profilePreviewSubtitle = computed(() => {
  if (!props.profilePreview) return ''
  const { callsign } = props.profilePreview
  return callsign ? `Callsign ${callsign}` : 'Tap to edit profile'
})

function itemsForGroup(group: string): SettingsNavItem[] {
  const items = navItemsByGroup(group)
  if (props.profilePreview) {
    return items.filter((i) => i.id !== 'profile')
  }
  return items
}

function rowSubtitle(item: SettingsNavItem): string | undefined {
  if (item.id === 'data' && props.syncStatusText) return props.syncStatusText
  return item.subtitle
}
</script>
