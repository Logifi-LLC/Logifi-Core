import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserIdentity } from '@supabase/supabase-js'
import { LAST_IDENTITY_GUARD_MESSAGE } from '~/utils/authIdentities'

const unlinkIdentity = vi.fn()
const getUserIdentities = vi.fn()
const linkIdentity = vi.fn()

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getUserIdentities: (...args: unknown[]) => getUserIdentities(...args),
      unlinkIdentity: (...args: unknown[]) => unlinkIdentity(...args),
      linkIdentity: (...args: unknown[]) => linkIdentity(...args),
    },
  },
}))

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorIos: () => false,
  isCapacitorNative: () => false,
}))

vi.mock('~/utils/appleWebSignIn', () => ({
  isAppleWebOAuthAvailable: () => true,
}))

function identity(provider: string, id: string): UserIdentity {
  return {
    id,
    identity_id: id,
    user_id: 'user-pilot-1',
    provider,
    identity_data: { email: `${provider}.pilot@example.com` },
  }
}

describe('useLinkedIdentities last-identity guard', () => {
  beforeEach(() => {
    unlinkIdentity.mockReset()
    getUserIdentities.mockReset()
    linkIdentity.mockReset()
  })

  it('does not unlink the last remaining identity', async () => {
    const { useLinkedIdentities } = await import('../useLinkedIdentities')
    const { identities, unlink, errorMessage } = useLinkedIdentities()
    const apple = identity('apple', 'id-apple-1')
    identities.value = [apple]

    await unlink(apple)

    expect(unlinkIdentity).not.toHaveBeenCalled()
    expect(errorMessage.value).toBe(LAST_IDENTITY_GUARD_MESSAGE)
  })

  it('unlinks when another identity remains', async () => {
    unlinkIdentity.mockResolvedValue({ error: null })
    const { useLinkedIdentities } = await import('../useLinkedIdentities')
    const { identities, unlink, errorMessage } = useLinkedIdentities()
    const apple = identity('apple', 'id-apple-1')
    const google = identity('google', 'id-google-1')
    identities.value = [apple, google]

    await unlink(google)

    expect(unlinkIdentity).toHaveBeenCalledTimes(1)
    expect(errorMessage.value).toBeNull()
    expect(identities.value).toEqual([apple])
  })
})
