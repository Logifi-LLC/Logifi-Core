import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import handler from '../logbook-transfer-request.post'
import * as supabaseUtils from '../../utils/supabase'

const { mockReadBody } = vi.hoisted(() => ({
  mockReadBody: vi.fn(),
}))

vi.mock('../../utils/supabase', () => ({
  getUserIdFromEvent: vi.fn(),
  getSupabaseClient: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: mockReadBody,
    createError: (opts: { statusCode: number; statusMessage: string }) => {
      const error = new Error(opts.statusMessage) as Error & {
        statusCode: number
        statusMessage: string
      }
      error.statusCode = opts.statusCode
      error.statusMessage = opts.statusMessage
      return error
    },
  }
})

const RESEND_URL = 'https://api.resend.com/emails'
const SLACK_URL = 'https://hooks.slack.com/services/test'
const PILOT_EMAIL = 'pilot@example.com'

function mockSupabase(options?: {
  email?: string | null
  userError?: boolean
  existing?: { id: string } | null
  insertError?: { code: string; message: string } | null
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options?.existing ?? null,
    error: null,
  })
  const insert = vi.fn().mockResolvedValue({ error: options?.insertError ?? null })
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
    insert,
  }))

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        options?.userError
          ? { data: { user: null }, error: { message: 'no session' } }
          : { data: { user: { email: options?.email ?? PILOT_EMAIL } }, error: null },
      ),
    },
    from,
  }

  vi.mocked(supabaseUtils.getSupabaseClient).mockReturnValue(client as never)
  return { insert }
}

describe('POST /api/logbook-transfer-request', () => {
  const env = process.env
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...env }
    delete process.env.RESEND_API_KEY
    delete process.env.LOGBOOK_TRANSFER_FROM_EMAIL
    delete process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK

    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
    }))
    vi.stubGlobal('fetch', fetchMock)

    vi.mocked(supabaseUtils.getUserIdFromEvent).mockResolvedValue('user-123')
    mockReadBody.mockResolvedValue({ sourceApp: 'LogTen', note: 'paper book' })
    mockSupabase()
  })

  afterEach(() => {
    process.env = env
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function resendCalls() {
    return fetchMock.mock.calls.filter((call) => call[0] === RESEND_URL)
  }

  function slackCalls() {
    return fetchMock.mock.calls.filter((call) => call[0] === SLACK_URL)
  }

  it('emails the saved address after insert, then posts to Slack', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK = SLACK_URL

    const result = await handler({} as H3Event)

    expect(result).toEqual({ success: true, alreadyRequested: false })
    expect(resendCalls()).toHaveLength(1)
    expect(slackCalls()).toHaveLength(1)
    expect(resendCalls()[0][0]).toBe(fetchMock.mock.calls[0][0])

    const init = resendCalls()[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init.body))).toEqual({
      from: 'Logifi <info@logifi.io>',
      to: [PILOT_EMAIL],
      subject: 'Got your Logifi logbook transfer request',
      reply_to: 'info@logifi.io',
      text: "Hey, thanks for requesting a logbook transfer. I got your request and I'll email you from info@logifi.io to set up a time. No need to do anything else right now. If you have questions, just reply to this email. — Derek, Logifi",
      html: "<p>Hey, thanks for requesting a logbook transfer. I got your request and I'll email you from info@logifi.io to set up a time. No need to do anything else right now.</p><p>If you have questions, just reply to this email.</p><p>— Derek, Logifi</p>",
    })
  })

  it('uses LOGBOOK_TRANSFER_FROM_EMAIL when set', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.LOGBOOK_TRANSFER_FROM_EMAIL = 'pilot@logifi.io'

    await handler({} as H3Event)

    const init = resendCalls()[0][1] as RequestInit
    expect(JSON.parse(String(init.body)).from).toBe('Logifi <pilot@logifi.io>')

    process.env.LOGBOOK_TRANSFER_FROM_EMAIL = 'Hangar <crew@logifi.io>'
    await handler({} as H3Event)
    const wrapped = resendCalls()[1][1] as RequestInit
    expect(JSON.parse(String(wrapped.body)).from).toBe('Hangar <crew@logifi.io>')
    expect(JSON.parse(String(wrapped.body)).reply_to).toBe('info@logifi.io')
  })

  it('skips the email with a server log when RESEND_API_KEY is unset and still posts to Slack', async () => {
    process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK = SLACK_URL
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await handler({} as H3Event)

    expect(result).toEqual({ success: true, alreadyRequested: false })
    expect(resendCalls()).toHaveLength(0)
    expect(slackCalls()).toHaveLength(1)
    expect(log).toHaveBeenCalledWith(
      '[logbook-transfer-request] RESEND_API_KEY unset; skipping confirmation email',
    )
  })

  it('returns success and still posts to Slack when Resend rejects the message', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK = SLACK_URL
    fetchMock.mockImplementation(async (url: string) => {
      if (url === RESEND_URL) {
        return { ok: false, status: 422, text: async () => '{"message":"invalid from"}' }
      }
      return { ok: true, status: 200, text: async () => '' }
    })
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await handler({} as H3Event)

    expect(result).toEqual({ success: true, alreadyRequested: false })
    expect(resendCalls()).toHaveLength(1)
    expect(slackCalls()).toHaveLength(1)
    expect(errorLog).toHaveBeenCalledWith(
      '[logbook-transfer-request] confirmation email returned',
      422,
      '{"message":"invalid from"}',
    )
  })

  it('returns success and still posts to Slack when the Resend request throws', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK = SLACK_URL
    fetchMock.mockImplementation(async (url: string) => {
      if (url === RESEND_URL) throw new Error('network down')
      return { ok: true, status: 200, text: async () => '' }
    })
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await handler({} as H3Event)

    expect(result).toEqual({ success: true, alreadyRequested: false })
    expect(slackCalls()).toHaveLength(1)
    expect(errorLog).toHaveBeenCalledWith(
      '[logbook-transfer-request] confirmation email error:',
      expect.any(Error),
    )
  })

  it('does not email when a pending request already exists', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK = SLACK_URL
    const { insert } = mockSupabase({ existing: { id: 'req-1' } })

    const result = await handler({} as H3Event)

    expect(result).toEqual({ success: true, alreadyRequested: true })
    expect(insert).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not email when the insert fails', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    mockSupabase({ insertError: { code: '42501', message: 'rls' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(handler({} as H3Event)).rejects.toThrow('Failed to save transfer request')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
