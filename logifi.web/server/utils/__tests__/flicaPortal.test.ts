import { describe, expect, it } from 'vitest'
import {
  listFlicaPortals,
  normalizeFlicaUserId,
  resolveFlicaPortal,
} from '../flicaPortal'

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
    expect(normalizeFlicaUserId('624619', p)).toBe('RPA624619')
    expect(normalizeFlicaUserId('RPA624619', p)).toBe('RPA624619')
  })

  it('lists allowlisted portals', () => {
    expect(listFlicaPortals().some((x) => x.airlineCode === 'RJET')).toBe(true)
  })
})
