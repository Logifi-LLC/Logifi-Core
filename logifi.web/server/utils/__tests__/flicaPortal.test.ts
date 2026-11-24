import { describe, expect, it } from 'vitest'
import {
  listFlicaPortals,
  normalizeFlicaUserId,
  resolveFlicaPortal,
} from '../flicaPortal'
import {
  airlineHasActiveCrewDigest,
  listFlicaCarriers,
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

  it('resolves a confirmed non-Republic host and does not invent a user-id prefix', () => {
    const p = resolveFlicaPortal('edv')
    expect(p.airlineCode).toBe('EDV')
    expect(p.host).toBe('endeavor.flica.net')
    expect(p.beta).toBe(true)
    expect(p.crewDigest).toBe(false)
    expect(p.userIdPrefix).toBeUndefined()
    expect(normalizeFlicaUserId('100001', p)).toBe('100001')
    expect(p.tripIdPattern).not.toBe(resolveFlicaPortal('RJET').tripIdPattern)
  })

  it('lists confirmed portals and keeps the crew digest on Republic only', () => {
    const portals = listFlicaPortals()
    expect(portals.map((p) => p.airlineCode).sort()).toEqual(
      ['AWI', 'EDV', 'FFT', 'HAL', 'JIA', 'NKS', 'PDT', 'RJET', 'WJA'].sort()
    )
    expect(portals.filter((p) => p.crewDigest).map((p) => p.airlineCode)).toEqual(['RJET'])
    expect(portals.filter((p) => !p.beta).map((p) => p.airlineCode)).toEqual(['RJET'])
    expect(listFlicaCarriers()[0]?.airlineCode).toBe('RJET')
  })

  it('prefers an existing Republic connection over another saved airline', () => {
    expect(preferredFlicaAirlineCode([])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['EDV'])).toBe('EDV')
    expect(preferredFlicaAirlineCode(['EDV', 'RJET'])).toBe('RJET')
    expect(preferredFlicaAirlineCode(['ZZZ'])).toBe('RJET')
    expect(airlineHasActiveCrewDigest('RJET')).toBe(true)
    expect(airlineHasActiveCrewDigest('EDV')).toBe(false)
    expect(airlineHasActiveCrewDigest(null)).toBe(true)
  })
})
