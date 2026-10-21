import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  __setAirportClientDbForTests,
  ensureAirportClientDbLoaded,
  isAirportClientDbLoaded,
} from '../airportClientDb'
import { loadAirportClientDbFixture } from './airportTestDb'

describe('ensureAirportClientDbLoaded', () => {
  afterEach(() => {
    __setAirportClientDbForTests(loadAirportClientDbFixture())
    vi.unstubAllGlobals()
  })

  it('memoizes a successful fetch', async () => {
    __setAirportClientDbForTests(null)
    const db = loadAirportClientDbFixture()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => db,
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(isAirportClientDbLoaded()).toBe(false)
    await ensureAirportClientDbLoaded()
    expect(isAirportClientDbLoaded()).toBe(true)
    await ensureAirportClientDbLoaded()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
