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
        supported: true,
        enabled: true,
      },
    ])
  })

  it('returns empty array for no rows', () => {
    expect(mapFlicaIntegrationsToAffiliations([])).toEqual([])
  })

  it('flags PSA (JIA) affiliations as unsupported', () => {
    const out = mapFlicaIntegrationsToAffiliations([
      {
        airline_code: 'JIA',
        portal_host: 'jia.flica.net',
        username: 'SYNTH_USER',
        last_ok_at: null,
        last_error: null,
      },
    ])
    expect(out[0]?.supported).toBe(false)
    expect(out[0]?.enabled).toBe(false)
  })

  it('flags a beta carrier not on the enable allowlist as not enabled', () => {
    const out = mapFlicaIntegrationsToAffiliations([
      {
        airline_code: 'EDV',
        portal_host: 'endeavor.flica.net',
        username: 'SYNTH_USER',
        last_ok_at: null,
        last_error: null,
      },
    ])
    expect(out[0]?.supported).toBe(true)
    expect(out[0]?.enabled).toBe(false)
  })
})
