const STORAGE_KEY = 'logifi:account-deleted-notice'

export function markAccountDeletedNotice(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore quota / private mode
  }
}

export function consumeAccountDeletedNotice(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    if (value !== '1') return false
    sessionStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
