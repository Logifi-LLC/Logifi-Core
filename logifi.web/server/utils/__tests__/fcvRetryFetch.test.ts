import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFcvWithRetry } from '../fcvRetryFetch'

describe('fetchFcvWithRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns first response when ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchFcvWithRetry('https://fcv.example/flights', {
      headers: { Authorization: 'Bearer x' },
    })

    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries on 503 then succeeds', async () => {
    vi.useFakeTimers()

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchFcvWithRetry('https://fcv.example/flights', {
      baseDelayMs: 100,
      maxAttempts: 4,
    })

    await vi.advanceTimersByTimeAsync(150)
    const res = await p

    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('honors Retry-After seconds', async () => {
    vi.useFakeTimers()

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('slow', {
          status: 429,
          headers: { 'retry-after': '2' },
        })
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchFcvWithRetry('https://fcv.example/flights', {
      baseDelayMs: 50,
    })

    await vi.advanceTimersByTimeAsync(1999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2)
    const res = await p

    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry on 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchFcvWithRetry('https://fcv.example/flights')

    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
