import { describe, expect, it } from 'vitest'
import {
  endorsementsPagePhase,
  loadEndorsementsPage,
  parseEndorsementsRole,
  type EndorsementsAccountRole,
} from '../endorsementsPageLoad'

const student = (): EndorsementsAccountRole => 'STUDENT'

describe('endorsements page phase', () => {
  it('stays on loading only while the read is in flight', () => {
    expect(endorsementsPagePhase({
      loading: true,
      authenticated: true,
      error: null,
    })).toBe('loading')
  })

  it('shows the signed-out empty state when there is no session', () => {
    expect(endorsementsPagePhase({
      loading: false,
      authenticated: false,
      error: null,
    })).toBe('signed-out')
  })

  it('shows the list or empty state once the read settles', () => {
    expect(endorsementsPagePhase({
      loading: false,
      authenticated: true,
      error: null,
    })).toBe('ready')
  })

  it('shows an error without staying on loading', () => {
    expect(endorsementsPagePhase({
      loading: false,
      authenticated: true,
      error: "Couldn't load endorsements.",
    })).toBe('error')
  })
})

describe('loadEndorsementsPage', () => {
  it('does not hang when auth never settles and there is no session', async () => {
    const result = await loadEndorsementsPage({
      initAuth: () => new Promise(() => {}),
      getUserId: () => null,
      readLocalRole: () => null,
      readRemoteRole: async () => 'INSTRUCTOR',
      timeoutMs: 20,
    })
    expect(result).toEqual({ authenticated: false, role: 'STUDENT', error: null })
    expect(endorsementsPagePhase({
      loading: false,
      authenticated: result.authenticated,
      error: result.error,
    })).toBe('signed-out')
  })

  it('returns an error and the saved role when the profile read hangs', async () => {
    const result = await loadEndorsementsPage({
      initAuth: async () => {},
      getUserId: () => 'pilot-1',
      readLocalRole: () => 'INSTRUCTOR',
      readRemoteRole: () => new Promise(() => {}),
      timeoutMs: 20,
    })
    expect(result.authenticated).toBe(true)
    expect(result.role).toBe('INSTRUCTOR')
    expect(result.error).toBeNull()
    expect(endorsementsPagePhase({
      loading: false,
      authenticated: true,
      error: result.error,
    })).toBe('ready')
  })

  it('uses the remote role and clears the error when the read succeeds', async () => {
    const result = await loadEndorsementsPage({
      initAuth: async () => {},
      getUserId: () => 'pilot-1',
      readLocalRole: student,
      readRemoteRole: async () => 'DUAL',
      timeoutMs: 20,
    })
    expect(result).toEqual({ authenticated: true, role: 'DUAL', error: null })
  })

  it('ignores a role value that is not one of the three accounts', () => {
    expect(parseEndorsementsRole('ADMIN')).toBeNull()
    expect(parseEndorsementsRole('STUDENT')).toBe('STUDENT')
  })
})
