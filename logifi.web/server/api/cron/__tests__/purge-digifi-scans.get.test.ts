import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import handler from '../purge-digifi-scans.get'
import * as supabaseServiceUtils from '../../../utils/supabaseService'
import * as purgeUtils from '../../../utils/digifiScanPurge'

vi.mock('../../../utils/supabaseService', () => ({
  getSupabaseServiceClient: vi.fn(),
}))

vi.mock('../../../utils/digifiScanPurge', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/digifiScanPurge')>(
    '../../../utils/digifiScanPurge'
  )
  return {
    ...actual,
    purgeExpiredDigifiScans: vi.fn(),
    createSupabaseDigifiScanSessionSource: vi.fn(() => ({})),
  }
})

function cronEvent(authorization?: string): H3Event {
  const headers = new Headers()
  if (authorization) headers.set('authorization', authorization)
  return {
    headers,
    node: {
      req: {
        headers: authorization ? { authorization } : {},
      },
    },
  } as H3Event
}

describe('GET /api/cron/purge-digifi-scans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', '')
    vi.stubGlobal('useRuntimeConfig', () => ({ cronSecret: '' }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does not purge when CRON_SECRET is unset', async () => {
    await expect(handler(cronEvent('Bearer anything'))).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Cron purge is not configured',
    })
    expect(purgeUtils.purgeExpiredDigifiScans).not.toHaveBeenCalled()
  })

  it('rejects a missing or wrong bearer token', async () => {
    vi.stubEnv('CRON_SECRET', 'hourly-secret')

    await expect(handler(cronEvent())).rejects.toMatchObject({ statusCode: 401 })
    await expect(handler(cronEvent('Bearer other-secret'))).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(purgeUtils.purgeExpiredDigifiScans).not.toHaveBeenCalled()
  })

  it('purges expired scans when the cron bearer matches', async () => {
    vi.stubEnv('CRON_SECRET', 'hourly-secret')
    vi.mocked(supabaseServiceUtils.getSupabaseServiceClient).mockReturnValue({} as never)
    vi.mocked(purgeUtils.purgeExpiredDigifiScans).mockResolvedValue({
      ok: true,
      sessionsSelected: 2,
      storageRemoved: 2,
      storageAlreadyGone: 0,
      sessionsDeleted: 2,
      skippedUnexpectedPath: 0,
      batches: 1,
      truncated: false,
      stoppedReason: 'complete',
    })

    const result = await handler(cronEvent('Bearer hourly-secret'))

    expect(purgeUtils.purgeExpiredDigifiScans).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ ok: true, sessionsDeleted: 2 })
  })

  it('returns 503 when the service-role client is unavailable', async () => {
    vi.stubEnv('CRON_SECRET', 'hourly-secret')
    vi.mocked(supabaseServiceUtils.getSupabaseServiceClient).mockReturnValue(null)

    await expect(handler(cronEvent('Bearer hourly-secret'))).rejects.toMatchObject({
      statusCode: 503,
    })
    expect(purgeUtils.purgeExpiredDigifiScans).not.toHaveBeenCalled()
  })
})
