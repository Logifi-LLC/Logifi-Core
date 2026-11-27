import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const OWNER = '00000000-0000-4000-8000-00000000000a'
const OTHER = '00000000-0000-4000-8000-00000000000b'
const ENTRY = '00000000-0000-4000-8000-0000000000e1'

const { state, createSignedUrl } = vi.hoisted(() => ({
  state: { storedPath: '' },
  createSignedUrl: vi.fn(async (path: string) => ({
    data: { signedUrl: `https://storage.example.test/${path}?token=t` },
    error: null,
  })),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getQuery: () => ({ entryId: ENTRY }),
    createError: (opts: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(opts.statusMessage), opts),
  }
})

vi.mock('../../utils/supabase', () => ({
  getUserIdFromEvent: vi.fn(async () => OWNER),
  getSupabaseClient: vi.fn(() => ({
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () =>
          table === 'log_entries'
            ? { data: { id: ENTRY }, error: null }
            : { data: { drawn_signature_url: state.storedPath }, error: null },
      }
      return chain
    },
  })),
}))

vi.mock('../../utils/supabaseService', () => ({
  getSupabaseServiceClient: () => ({
    storage: { from: () => ({ createSignedUrl }) },
  }),
}))

describe('GET /api/flight-signature/drawn-url', () => {
  beforeEach(() => {
    createSignedUrl.mockClear()
  })

  it('signs a drawn signature stored in the owner folder', async () => {
    state.storedPath = `flight-signatures/${OWNER}/${ENTRY}.png`
    const { default: handler } = await import('../flight-signature/drawn-url.get')
    const result = await handler({} as H3Event)
    expect(createSignedUrl).toHaveBeenCalledWith(`${OWNER}/${ENTRY}.png`, 3600)
    expect(result.url).toContain(`${OWNER}/${ENTRY}.png`)
  })

  it("refuses to sign a path in another user's folder", async () => {
    state.storedPath = `${OTHER}/${ENTRY}.png`
    const { default: handler } = await import('../flight-signature/drawn-url.get')
    await expect(handler({} as H3Event)).rejects.toMatchObject({ statusCode: 403 })
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('refuses a path that climbs out of the owner folder', async () => {
    state.storedPath = `${OWNER}/../${OTHER}/${ENTRY}.png`
    const { default: handler } = await import('../flight-signature/drawn-url.get')
    await expect(handler({} as H3Event)).rejects.toMatchObject({ statusCode: 403 })
  })
})
