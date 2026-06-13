import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  migrateGlobalToScoped,
  scopedKey,
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
    localStorage.setItem(ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK, '["entry"]')
    const copied = migrateGlobalToScoped(ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK, 'user-a')
    expect(copied).toBe(true)
    expect(localStorage.getItem('logifi://logbook/v1/user-a')).toBe('["entry"]')
    expect(migrateGlobalToScoped(ACCOUNT_SCOPED_STORAGE_KEYS.LOGBOOK, 'user-a')).toBe(false)
  })
})
