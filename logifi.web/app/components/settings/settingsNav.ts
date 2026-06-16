export type SettingsTabId = 'profile' | 'account' | 'preferences' | 'digifi' | 'updates' | 'data' | 'compliance'

export type SettingsStackFrame = 'root' | SettingsTabId | 'account-email' | 'account-password'

export interface SettingsNavItem {
  id: SettingsTabId
  label: string
  icon: string
  group: string
  subtitle: string
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'profile',
    label: 'Pilot Profile',
    icon: 'ri:user-smile-line',
    group: 'You',
    subtitle: 'Name, certs, stats',
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'ri:shield-user-line',
    group: 'You',
    subtitle: 'Email, password, credits',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: 'ri:settings-4-line',
    group: 'Logbook',
    subtitle: 'Display, totals, entry cards',
  },
  {
    id: 'digifi',
    label: 'Digifi',
    icon: 'ri:scan-line',
    group: 'Logbook',
    subtitle: 'Paper logbook scanning',
  },
  {
    id: 'data',
    label: 'Data & Sync',
    icon: 'ri:database-2-line',
    group: 'Logbook',
    subtitle: 'Import, export, integrations',
  },
  {
    id: 'updates',
    label: 'Updates',
    icon: 'ri:megaphone-line',
    group: 'About',
    subtitle: "What's new in Logifi",
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: 'ri:shield-check-line',
    group: 'About',
    subtitle: 'AC 120-78B & Part 61',
  },
]

export const SETTINGS_NAV_GROUPS = ['You', 'Logbook', 'About'] as const

export function settingsTabTitle(tab: SettingsTabId): string {
  const item = SETTINGS_NAV_ITEMS.find((i) => i.id === tab)
  return item?.label ?? tab
}

export function settingsStackTitle(frame: SettingsStackFrame): string {
  if (frame === 'root') return 'Settings'
  if (frame === 'account-email') return 'Change Email'
  if (frame === 'account-password') return 'Change Password'
  return settingsTabTitle(frame)
}

export function isSettingsTabId(frame: SettingsStackFrame): frame is SettingsTabId {
  return frame !== 'root' && frame !== 'account-email' && frame !== 'account-password'
}

export function navItemsByGroup(group: string): SettingsNavItem[] {
  return SETTINGS_NAV_ITEMS.filter((i) => i.group === group)
}
