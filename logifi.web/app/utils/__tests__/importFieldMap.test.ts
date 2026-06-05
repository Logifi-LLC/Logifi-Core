import { describe, it, expect } from 'vitest'
import {
  resolveImportNumber,
  resolveImportAircraftMakeModel,
  resolveImportRole,
  extractBaseModelName,
} from '../importFieldMap'

describe('importFieldMap', () => {
  it('resolves Total and Turbine aliases for total time', () => {
    expect(resolveImportNumber({ Total: '1.3' }, 'total')).toBe(1.3)
    expect(resolveImportNumber({ Turbine: '2.0' }, 'total')).toBe(2)
  })

  it('resolves Actual and Hood aliases for instrument time', () => {
    expect(resolveImportNumber({ Actual: '0.5' }, 'actualInstrument')).toBe(0.5)
    expect(resolveImportNumber({ Hood: '1.6' }, 'simulatedInstrument')).toBe(1.6)
  })

  it('resolves NVG column', () => {
    expect(resolveImportNumber({ NVG: '1.2' }, 'nvg')).toBe(1.2)
    expect(resolveImportNumber({ 'Night Vision': '2.5' }, 'nvg')).toBe(2.5)
  })

  it('resolves Aircraft Type for make/model', () => {
    expect(resolveImportAircraftMakeModel({ 'Aircraft Type': 'UH-60L' })).toBe('UH-60L')
  })

  it('infers Dual Received from dual time when role missing', () => {
    expect(resolveImportRole({ 'Dual Received': '1.3' })).toBe('Dual Received')
    expect(resolveImportRole({ Role: 'Dual Recieved' })).toBe('Dual Received')
    expect(resolveImportRole({ 'Dual Received': '1.0', PIC: '1.0' })).toBe('PIC')
  })

  describe('extractBaseModelName', () => {
    it('preserves simulator device names', () => {
      expect(extractBaseModelName('L Sim - Full Motion')).toBe('L Sim - Full Motion')
    })

    it('extracts standard airframe model codes', () => {
      expect(extractBaseModelName('C-172 S G-1000, Cessna Skyhawk SP')).toBe('C-172')
      expect(extractBaseModelName('UH-60L')).toBe('UH-60')
    })

    it('returns first word for short non-sim names', () => {
      expect(extractBaseModelName('Redbird FMX')).toBe('Redbird')
    })
  })
})
