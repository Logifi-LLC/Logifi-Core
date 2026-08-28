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
  ENTRY_CARD_PRESET: 'logifi-entry-card-preset',
  ACTIVE_LOGBOOK: 'logifi-active-logbook',
  TOTALS_METRICS: 'logifi-totals-metrics',
  SHOW_CURRENCY_CHIPS: 'logifi-show-currency-chips',
  BUILDER_DRAFT: 'logifi-logbook-builder-draft',
  BUILDER_DEFAULT_ROLE: 'logifi-logbook-builder-default-role',
  AIRCRAFT_TAIL_CONSOLIDATION: 'logifi://aircraft-tail-consolidation-v3',
} as const

export type AccountScopedStorageKey =
  (typeof ACCOUNT_SCOPED_STORAGE_KEYS)[keyof typeof ACCOUNT_SCOPED_STORAGE_KEYS]

/** Keys intentionally shared across accounts on the same device/browser. */
export const DEVICE_GLOBAL_STORAGE_KEYS = {
  THEME: 'logifi-theme',
  THEME_LEGACY: 'theme',
  CLOCK_FORMAT: 'logifi-clock-format',
  CLOCK_ZONE: 'logifi-clock-zone',
  AIRCRAFT_CACHE: 'logifi://aircraft-cache-v2',
  AIRPORT_CACHE: 'logifi://airport-cache',
  UPDATES_DISMISSED: 'logifi-updates-dismissed-id',
} as const

export function scopedKey(baseKey: string, userId: string): string {
  return `${baseKey}/${userId}`
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; code?: number }
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22
  )
}

/** localStorage.setItem that never throws on quota — returns false if the write failed. */
export function tryLocalStorageSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn('[userScopedStorage] localStorage quota exceeded for', key)
      return false
    }
    throw err
  }
}

export function getScopedItem(baseKey: string, userId: string): string | null {
  if (typeof window === 'undefined' || !userId) return null
  return window.localStorage.getItem(scopedKey(baseKey, userId))
}

export function setScopedItem(baseKey: string, userId: string, value: string): void {
  if (typeof window === 'undefined' || !userId) return
  tryLocalStorageSetItem(scopedKey(baseKey, userId), value)
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

  if (!tryLocalStorageSetItem(scoped, global)) return false
  if (removeGlobal) {
    window.localStorage.removeItem(baseKey)
  }
  return true
}

/**
 * Full logbook JSON must not be duplicated into per-user localStorage on login.
 * Signed-in offline uses IndexedDB; Supabase migration still reads the legacy
 * unscoped key via readScopedOrLegacy. Copying it is what blows the ~5MB quota.
 */
const SKIP_SCOPED_MIGRATION_KEYS = new Set<string>([
  ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK,
])

/** Migrate all account-scoped legacy global keys for a user on first login after upgrade. */
export function migrateAllGlobalKeysToScoped(userId: string, removeGlobal = false): void {
  for (const baseKey of Object.values(ACCOUNT_SCOPED_STORAGE_KEYS)) {
    if (SKIP_SCOPED_MIGRATION_KEYS.has(baseKey)) continue
    migrateGlobalToScoped(baseKey, userId, removeGlobal)
  }
}
