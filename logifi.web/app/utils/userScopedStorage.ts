/**
 * Per-user localStorage key helpers.
 * Account-specific data is namespaced by userId; device-global prefs stay unscoped.
 */

export const ACCOUNT_SCOPED_STORAGE_KEYS = {
  LOGBOOK: 'logifi://logbook/v1',
  PILOT_PROFILE: 'logifi://pilot-profile',
  CREW_PROFILES: 'logifi://crew-profiles',
  MIGRATION_STATUS: 'logifi://migration-status',
  COLUMN_CONFIG: 'logifi-logbook-columns',
  ACTIVE_LOGBOOK: 'logifi-active-logbook',
  TOTALS_METRICS: 'logifi-totals-metrics',
  BUILDER_DRAFT: 'logifi-logbook-builder-draft',
  BUILDER_DEFAULT_ROLE: 'logifi-logbook-builder-default-role',
} as const

export type AccountScopedStorageKey =
  (typeof ACCOUNT_SCOPED_STORAGE_KEYS)[keyof typeof ACCOUNT_SCOPED_STORAGE_KEYS]

/** Keys intentionally shared across accounts on the same device/browser. */
export const DEVICE_GLOBAL_STORAGE_KEYS = {
  THEME: 'logifi-theme',
  THEME_LEGACY: 'theme',
  CLOCK_FORMAT: 'logifi-clock-format',
  CLOCK_ZONE: 'logifi-clock-zone',
  AIRCRAFT_CACHE: 'logifi://aircraft-cache',
  AIRPORT_CACHE: 'logifi://airport-cache',
  UPDATES_DISMISSED: 'logifi-updates-dismissed-id',
} as const

export function scopedKey(baseKey: string, userId: string): string {
  return `${baseKey}/${userId}`
}

export function getScopedItem(baseKey: string, userId: string): string | null {
  if (typeof window === 'undefined' || !userId) return null
  return window.localStorage.getItem(scopedKey(baseKey, userId))
}

export function setScopedItem(baseKey: string, userId: string, value: string): void {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.setItem(scopedKey(baseKey, userId), value)
}

export function removeScopedItem(baseKey: string, userId: string): void {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.removeItem(scopedKey(baseKey, userId))
}

/**
 * One-time migration: copy global legacy key to scoped key if scoped is empty.
 * Returns true if data was copied.
 */
export function migrateGlobalToScoped(
  baseKey: string,
  userId: string,
  removeGlobal = false
): boolean {
  if (typeof window === 'undefined' || !userId) return false

  const scoped = scopedKey(baseKey, userId)
  if (window.localStorage.getItem(scoped) != null) return false

  const global = window.localStorage.getItem(baseKey)
  if (global == null) return false

  window.localStorage.setItem(scoped, global)
  if (removeGlobal) {
    window.localStorage.removeItem(baseKey)
  }
  return true
}

/** Migrate all account-scoped legacy global keys for a user on first login after upgrade. */
export function migrateAllGlobalKeysToScoped(userId: string, removeGlobal = false): void {
  for (const baseKey of Object.values(ACCOUNT_SCOPED_STORAGE_KEYS)) {
    migrateGlobalToScoped(baseKey, userId, removeGlobal)
  }
}
