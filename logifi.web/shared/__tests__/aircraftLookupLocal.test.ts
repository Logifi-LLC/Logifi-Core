import { describe, expect, it } from 'vitest'
import {
  aircraftEngineDisplay,
  isLegacyAircraftCacheEntry,
  isNumericEngineCode,
} from '../aircraftLookupLocal'

describe('isNumericEngineCode', () => {
  it('detects FAA ENG MFR MDL codes', () => {
    expect(isNumericEngineCode('41597')).toBe(true)
    expect(isNumericEngineCode('Piston')).toBe(false)
    expect(isNumericEngineCode('')).toBe(false)
  })
})

describe('isLegacyAircraftCacheEntry', () => {
  it('treats coded engineType as stale cache', () => {
    expect(isLegacyAircraftCacheEntry({ engineType: '41597' })).toBe(true)
    expect(
      isLegacyAircraftCacheEntry({
        engineType: 'Piston',
        engineModel: 'LYCOMING IO-360-L2A',
      })
    ).toBe(false)
  })
})

describe('aircraftEngineDisplay', () => {
  it('hides numeric codes and prefers the engine model', () => {
    expect(aircraftEngineDisplay({ engineType: '41597' })).toEqual({})
    expect(
      aircraftEngineDisplay({
        engineType: 'Piston',
        engineModel: 'LYCOMING IO-360-L2A',
      })
    ).toEqual({ type: 'Piston', model: 'LYCOMING IO-360-L2A' })
  })
})
