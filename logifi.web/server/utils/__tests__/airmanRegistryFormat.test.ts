import { describe, expect, it } from 'vitest'
import {
  formatAirmanRegistryName,
  formatGroupedCertificateBlocks,
  formatRegistryLabel,
  formatTypeRatingCode,
} from '../airmanRegistryFormat'

describe('formatAirmanRegistryName', () => {
  it('converts FAA last-first comma format to title case', () => {
    expect(formatAirmanRegistryName('FARMER, DEREK A')).toBe('Derek A Farmer')
  })

  it('title-cases space-separated names', () => {
    expect(formatAirmanRegistryName('CHARLES ELWOOD YEAGER')).toBe('Charles Elwood Yeager')
  })
})

describe('formatRegistryLabel', () => {
  it('title-cases certificate and rating labels', () => {
    expect(formatRegistryLabel('AIRPLANE SINGLE ENGINE LAND')).toBe('Airplane Single Engine Land')
    expect(formatRegistryLabel('FLIGHT INSTRUCTOR')).toBe('Flight Instructor')
  })

  it('uppercases type-rating designators after the category slash', () => {
    expect(formatTypeRatingCode('A/erj-170')).toBe('A/ERJ-170')
    expect(formatTypeRatingCode('A/erj-190')).toBe('A/ERJ-190')
    expect(formatRegistryLabel('C/L-18')).toBe('C/L-18')
  })
})

describe('formatGroupedCertificateBlocks', () => {
  it('separates pilot and instructor sections with a blank line', () => {
    const result = formatGroupedCertificateBlocks(
      ['Airline Transport Pilot · Airplane Multiengine Land'],
      ['Flight Instructor · Airplane Single Engine · Instrument Airplane']
    )
    expect(result).toContain('Airline Transport Pilot')
    expect(result).toContain('\n\n')
    expect(result).toMatch(/Flight Instructor[\s\S]*Instrument Airplane/)
    expect(result.indexOf('Airline')).toBeLessThan(result.indexOf('Flight Instructor'))
  })
})
