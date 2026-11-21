import { REMOTE_READ_TIMEOUT_MS, withTimeout } from './promiseTimeout'

export type EndorsementsAccountRole = 'STUDENT' | 'INSTRUCTOR' | 'DUAL'

export type EndorsementsPagePhase = 'loading' | 'signed-out' | 'ready' | 'error'

export function parseEndorsementsRole(value: unknown): EndorsementsAccountRole | null {
  if (value === 'STUDENT' || value === 'INSTRUCTOR' || value === 'DUAL') return value
  return null
}

/** Loading stays on screen only while the read is in flight. Error still shows the list. */
export function endorsementsPagePhase(input: {
  loading: boolean
  authenticated: boolean
  error: string | null
}): EndorsementsPagePhase {
  if (input.loading) return 'loading'
  if (!input.authenticated) return 'signed-out'
  if (input.error) return 'error'
  return 'ready'
}

export type EndorsementsPageLoadResult = {
  authenticated: boolean
  role: EndorsementsAccountRole
  error: string | null
}

export async function loadEndorsementsPage(deps: {
  initAuth: () => Promise<void>
  getUserId: () => string | null
  readLocalRole: () => EndorsementsAccountRole | null
  readRemoteRole: (userId: string) => Promise<EndorsementsAccountRole | null>
  timeoutMs?: number
}): Promise<EndorsementsPageLoadResult> {
  const timeoutMs = deps.timeoutMs ?? REMOTE_READ_TIMEOUT_MS
  try {
    await withTimeout(deps.initAuth(), timeoutMs, 'Auth')
  } catch {
    // Auth didn't settle. Use whatever session is already in memory.
  }

  const userId = deps.getUserId()
  if (!userId) {
    return { authenticated: false, role: 'STUDENT', error: null }
  }

  const localRole = deps.readLocalRole()
  const role = localRole ?? 'STUDENT'
  try {
    const remote = await withTimeout(
      deps.readRemoteRole(userId),
      timeoutMs,
      'Profile role'
    )
    return { authenticated: true, role: remote ?? role, error: null }
  } catch {
    return {
      authenticated: true,
      role,
      error: "Couldn't load endorsements.",
    }
  }
}
