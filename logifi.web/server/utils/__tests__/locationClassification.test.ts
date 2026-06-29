import { describe, it, expect } from 'vitest'
import { classifyLocationCode } from '../locationClassification'
import { lookupNavaid } from '../navaidLookup'

describe('locationClassification', () => {
  it('classifies FWA as navaid', () => {
    expect(classifyLocationCode('FWA').kind).toBe('navaid')
    expect(classifyLocationCode('FWA').latitude).toBeDefined()
  })

  it('classifies KFWA as airport', () => {
    expect(classifyLocationCode('KFWA').kind).toBe('airport')
  })

  it('classifies WOZEE as unknown', () => {
    expect(classifyLocationCode('WOZEE').kind).toBe('unknown')
  })
})

describe('navaidLookup', () => {
  it('finds Fort Wayne VORTAC by ident', () => {
    const entry = lookupNavaid('FWA')
    expect(entry?.type).toBe('VORTAC')
    expect(entry?.associatedAirport).toBe('KFWA')
  })
})
