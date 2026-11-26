import { describe, expect, it } from 'vitest'
import {
  FlicaDisabledAirlineError,
  FlicaUnsupportedAirlineError,
  listFlicaPortals,
  normalizeFlicaUserId,
  resolveFlicaPortal,
} from '../flicaPortal'
import {
  airlineHasActiveCrewDigest,
  isFlicaCarrierEnabled,
  isFlicaCarrierSupported,
  listFlicaCarriers,
  listSelectableFlicaCarriers,
  preferredFlicaAirlineCode,
} from '../../../shared/flicaCarriers'

describe('flicaPortal', () => {
  it('resolves RJET by default', () => {
    const p = resolveFlicaPortal()
    expect(p.airlineCode).toBe('RJET')
    expect(p.host).toBe('rpa.flica.net')
  })

  it('rejects unknown airline codes', () => {
    expect(() => resolveFlicaPortal('ZZZ')).toThrow(/Unsupported/)
  })

  it('prefixes employee numbers for RJET', () => {
    const p = resolveFlicaPortal('RJET')
    expect(p.host).toBe('rpa.flica.net')
    expect(p.beta).toBe(false)
    expect(p.crewDigest).toBe(true)
    expect(normalizeFlicaUserId('100001', p)).toBe('RPA100001')
    expect(normalizeFlicaUserId('RPA100001', p)).toBe('RPA100001')
  })

  it('rejects connect for a confirmed but not-yet-enabled host with 409-style error', () => {
    expect(() => resolveFlicaPortal('edv')).toThrow(FlicaDisabledAirlineError)
    expect(() => resolveFlicaPortal('EDV')).toThrow(/Autofi isn't available for Endeavor Air yet/)
  })

  it('marks PSA and Piedmont unsupported (airline SSO) and excludes them from selectable lists', () => {
    expect(isFlicaCarrierSupported('JIA')).toBe(false)
    expect(isFlicaCarrierSupported('PDT')).toBe(false)
    expect(isFlicaCarrierSupported('RJET')).toBe(true)
    const selectable = listSelectableFlicaCarriers().map((c) => c.airlineCode)
    expect(selectable).not.toContain('JIA')
    expect(selectable).not.toContain('PDT')
    expect(selectable).toContain('RJET')
    expect(() => resolveFlicaPortal('JIA')).toThrow(FlicaUnsupportedAirlineError)
    expect(() => resolveFlicaPortal('PDT')).toThrow(
      expect.objectContaining({ code: 'airline_sso' })
    )
  })

  it('lists only enabled, supported portals (Republic only in main release)', () => {
    const portals = listFlicaPortals()
    expect(portals.map((p) => p.airlineCode)).toEqual(['RJET'])
    expect(listSelectableFlicaCarriers().map((c) => c.airlineCode)).toEqual(['RJET'])
    expect(portals.filter((p) => p.crewDigest).map((p) => p.airlineCode)).toEqual(['RJET'])
    expect(portals.filter((p) => !p.beta).map((p) => p.airlineCode)).toEqual(['RJET'])
    expect(listFlicaCarriers()[0]?.airlineCode).toBe('RJET')
  })

  it('prefers an existing Republic connection over another saved airline', () => {
    expect(preferredFlicaAirlineCode([])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['EDV'])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['EDV', 'RJET'])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['ZZZ'])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['JIA'])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['JIA', 'AWI'])).toBe('RJET')
    expect(isFlicaCarrierEnabled('EDV')).toBe(false)
    expect(isFlicaCarrierEnabled('EDV', ['RJET', 'EDV'])).toBe(true)
    expect(listSelectableFlicaCarriers(['RJET', 'EDV']).map((c) => c.airlineCode)).toEqual([
      'RJET',
      'EDV',
    ])
    expect(airlineHasActiveCrewDigest('RJET')).toBe(true)
    expect(airlineHasActiveCrewDigest('EDV')).toBe(false)
    expect(airlineHasActiveCrewDigest(null)).toBe(true)
  })
})
