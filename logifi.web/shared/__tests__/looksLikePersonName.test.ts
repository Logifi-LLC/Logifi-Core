import { describe, expect, it } from 'vitest'
import { collectPilotCatalogNames, looksLikePersonName } from '../looksLikePersonName'

describe('looksLikePersonName', () => {
  it('accepts real person names', () => {
    expect(looksLikePersonName('Harvey Dent')).toBe(true)
    expect(looksLikePersonName('James Gordon')).toBe(true)
    expect(looksLikePersonName("Mary-Jo O'Neil")).toBe(true)
    expect(looksLikePersonName('J. R. Smith')).toBe(true)
  })

  it('rejects lesson text', () => {
    expect(looksLikePersonName('Hood work')).toBe(false)
    expect(looksLikePersonName('XC navigation')).toBe(false)
    expect(looksLikePersonName('Pattern work')).toBe(false)
    expect(looksLikePersonName('Touch and goes')).toBe(false)
    expect(looksLikePersonName('XC nav')).toBe(false)
    expect(looksLikePersonName('Steep turns, slow flight, stalls')).toBe(false)
  })
})

describe('collectPilotCatalogNames', () => {
  it('includes PIC/SIC names and skips lesson text in trainingElements', () => {
    expect(
      collectPilotCatalogNames({
        picName: 'Harvey Dent',
        sicName: 'James Gordon',
        trainingElements: 'Hood work',
      }),
    ).toEqual(['Harvey Dent', 'James Gordon'])
  })

  it('includes a person-shaped trainingElements value', () => {
    expect(
      collectPilotCatalogNames({
        picName: null,
        sicName: null,
        trainingElements: 'Harvey Dent',
      }),
    ).toEqual(['Harvey Dent'])
  })
})
