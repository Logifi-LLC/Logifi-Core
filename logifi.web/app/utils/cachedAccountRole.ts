import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
  setScopedItem,
} from '~/utils/userScopedStorage'
import { parseEndorsementsRole, type EndorsementsAccountRole } from '~/utils/endorsementsPageLoad'

const ROLE_CACHE_KEY = 'logifi://cached-account-role'

export function readCachedAccountRole(userId: string): EndorsementsAccountRole | null {
  try {
    const fromPilot = getScopedItem(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, userId)
    if (fromPilot) {
      const parsed = JSON.parse(fromPilot) as { role?: unknown }
      const role = parseEndorsementsRole(parsed.role)
      if (role) return role
    }
    const direct = getScopedItem(ROLE_CACHE_KEY, userId)
    if (!direct) return null
    return parseEndorsementsRole(JSON.parse(direct).role)
  } catch {
    return null
  }
}

export function writeCachedAccountRole(userId: string, role: EndorsementsAccountRole): void {
  setScopedItem(ROLE_CACHE_KEY, userId, JSON.stringify({ role, cachedAt: Date.now() }))
}