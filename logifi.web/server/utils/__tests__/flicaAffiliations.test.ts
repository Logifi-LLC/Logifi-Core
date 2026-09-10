import { describe, expect, it } from 'vitest'
import { mapFlicaIntegrationsToAffiliations } from '../flicaAffiliations'

describe('mapFlicaIntegrationsToAffiliations', () => {
  it('maps snake_case rows to camelCase DTOs with connected true', () => {
    const out = mapFlicaIntegrationsToAffiliations([
      {
        airline_code: 'RJET',
        portal_host: 'rpa.flica.net',
        username: 'RPA624619',
        last_ok_at: '2026-01-15T12:00:00.000Z',
        last_error: null,
      },
    ])
    expect(out).toEqual([
      {
        airlineCode: 'RJET',
        connected: true,
        portalHost: 'rpa.flica.net',
        username: 'RPA624619',
        lastOkAt: '2026-01-15T12:00:00.000Z',
        lastError: null,
      },
    ])
  })

  it('returns empty array for no rows', () => {
    expect(mapFlicaIntegrationsToAffiliations([])).toEqual([])
  })
})
