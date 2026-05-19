export type SettingsTabId = 'profile' | 'account' | 'preferences' | 'data' | 'compliance'

export interface SettingsNavItem {
  id: SettingsTabId
  label: string
  icon: string
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: 'profile', label: 'Pilot Profile', icon: 'ri:user-smile-line' },
  { id: 'account', label: 'Account', icon: 'ri:shield-user-line' },
  { id: 'preferences', label: 'Preferences', icon: 'ri:settings-4-line' },
  { id: 'data', label: 'Data & Sync', icon: 'ri:database-2-line' },
  { id: 'compliance', label: 'Compliance', icon: 'ri:shield-check-line' },
]

export function settingsTabTitle(tab: SettingsTabId): string {
  const item = SETTINGS_NAV_ITEMS.find((i) => i.id === tab)
  return item?.label ?? tab
}
