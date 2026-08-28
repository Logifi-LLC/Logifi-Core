import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  migrateAllGlobalKeysToScoped,
  migrateGlobalToScoped,
  scopedKey,
  tryLocalStorageSetItem,
} from '../userScopedStorage'

describe('userScopedStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null
      },
      setItem(key: string, value: string) {
        this.store[key] = value
      },
      removeItem(key: string) {
        delete this.store[key]
      },
      clear() {
        this.store = {}
      },
    })
    localStorage.clear()
  })

  it('builds scoped keys with user id suffix', () => {
    expect(scopedKey(ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK, 'user-a')).toBe(
      'logifi://logbook/v1/user-a'
    )
  })

  it('copies global legacy data into scoped storage once', () => {
    localStorage.setItem(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, '{"name":"A"}')
    const copied = migrateGlobalToScoped(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, 'user-a')
    expect(copied).toBe(true)
    expect(localStorage.getItem('logifi://pilot-profile/user-a')).toBe('{"name":"A"}')
    expect(migrateGlobalToScoped(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, 'user-a')).toBe(false)
  })

  it('does not duplicate full logbook into scoped localStorage on login migrate', () => {
    localStorage.setItem(ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK, '["huge"]')
    migrateAllGlobalKeysToScoped('user-a')
    expect(localStorage.getItem('logifi://logbook/v1/user-a')).toBeNull()
    expect(localStorage.getItem(ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK)).toBe('["huge"]')
  })

  it('swallows QuotaExceededError on setItem', () => {
    const err = new DOMException('quota', 'QuotaExceededError')
    const store: Record<string, string> = {
      [ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE]: '{"name":"A"}',
    }
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: () => {
        throw err
      },
      removeItem: () => {},
      clear: () => {},
    })
    expect(tryLocalStorageSetItem('k', 'v')).toBe(false)
    expect(
      migrateGlobalToScoped(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, 'user-a')
    ).toBe(false)
  })
})
