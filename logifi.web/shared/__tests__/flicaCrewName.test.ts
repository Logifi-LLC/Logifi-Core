import { describe, expect, it } from 'vitest'
import {
  applyCatalogPilotPick,
  filterCatalogPilotNames,
  flicaCrewNamesMatch,
  normalizeFlicaCrewName,
  seedPreviewCrewNames,
  uniqueConfidentCatalogMatch,
  type PreviewCrewLeg,
} from '../flicaCrewName'

describe('normalizeFlicaCrewName', () => {
  it('title-cases ALL CAPS and flips LAST, FIRST to First Last', () => {
    expect(normalizeFlicaCrewName('SMITH, JOHN')).toBe('John Smith')
    expect(normalizeFlicaCrewName('smith, john')).toBe('John Smith')
  })

  it('keeps middle names and initials', () => {
    expect(normalizeFlicaCrewName('SMITH, JOHN ADAM')).toBe('John Adam Smith')
    expect(normalizeFlicaCrewName('SMITH, JOHN A.')).toBe('John A Smith')
    expect(normalizeFlicaCrewName('SMITH, JOHN A')).toBe('John A Smith')
  })

  it('collapses extra spaces', () => {
    expect(normalizeFlicaCrewName('  SMITH,   JOHN  ')).toBe('John Smith')
    expect(normalizeFlicaCrewName('SMITH,  JOHN   ADAM')).toBe('John Adam Smith')
  })

  it('leaves an already ordered name in First Last order', () => {
    expect(normalizeFlicaCrewName('John Smith')).toBe('John Smith')
    expect(normalizeFlicaCrewName('john adam smith')).toBe('John Adam Smith')
  })
})

describe('flicaCrewNamesMatch', () => {
  it('matches either order, case, spacing, and punctuation', () => {
    expect(flicaCrewNamesMatch('SMITH, JOHN', 'John Smith')).toBe(true)
    expect(flicaCrewNamesMatch('smith,  john', 'JOHN SMITH')).toBe(true)
    expect(flicaCrewNamesMatch('  SMITH,   JOHN  ', 'John Smith')).toBe(true)
    expect(flicaCrewNamesMatch('SMITH, JOHN A.', 'John A Smith')).toBe(true)
    expect(flicaCrewNamesMatch("O'BRIEN, SEAN", 'Sean Obrien')).toBe(true)
    expect(flicaCrewNamesMatch("O'BRIEN, SEAN", "Sean O'Brien")).toBe(true)
    expect(flicaCrewNamesMatch('SMITH-JONES, MARY', 'Mary Smith Jones')).toBe(true)
    expect(flicaCrewNamesMatch('SMITH, JOHN', 'Jane Doe')).toBe(false)
    expect(flicaCrewNamesMatch('SMITH, JOHN A', 'John Smith')).toBe(false)
  })
})

describe('catalog pilot lookup', () => {
  const catalog = ['John Smith', 'Amy Beta', 'John Adam Smith']

  it('finds a catalog entry from either name order', () => {
    expect(filterCatalogPilotNames(catalog, 'SMITH, JOHN')).toEqual([
      'John Smith',
      'John Adam Smith',
    ])
    expect(filterCatalogPilotNames(catalog, 'john smith')).toEqual([
      'John Smith',
      'John Adam Smith',
    ])
    expect(filterCatalogPilotNames(catalog, 'beta')).toEqual(['Amy Beta'])
  })

  it('auto-selects only when exactly one catalog name matches', () => {
    expect(uniqueConfidentCatalogMatch(catalog, 'SMITH, JOHN')).toBe('John Smith')
    expect(uniqueConfidentCatalogMatch(catalog, 'SMITH, JOHN ADAM')).toBe('John Adam Smith')
    expect(uniqueConfidentCatalogMatch(['John A. Smith', 'Amy Beta'], 'SMITH, JOHN A')).toBe(
      'John A. Smith'
    )
    expect(uniqueConfidentCatalogMatch(['John Smith', 'JOHN SMITH'], 'SMITH, JOHN')).toBeNull()
    expect(uniqueConfidentCatalogMatch(['Amy Beta'], 'SMITH, JOHN')).toBeNull()
    expect(uniqueConfidentCatalogMatch(catalog, 'SMITH, JOHN A')).toBeNull()
  })
})

function fourLegPairing(): PreviewCrewLeg[] {
  return [
    { id: 'fcv-1', rawName: 'SMITH, JOHN' },
    { id: 'fcv-2', rawName: 'smith, john' },
    { id: 'fcv-3', rawName: 'SMITH,  JOHN' },
    { id: 'fcv-4', rawName: 'SMITH, JOHN.' },
  ]
}

describe('multi-leg First Officer picks', () => {
  it('auto-matches every leg when the catalog has one confident pilot', () => {
    const names = seedPreviewCrewNames(fourLegPairing(), ['John Smith', 'Amy Beta'])
    expect(names).toEqual({
      'fcv-1': 'John Smith',
      'fcv-2': 'John Smith',
      'fcv-3': 'John Smith',
      'fcv-4': 'John Smith',
    })
  })

  it('fills all 4 legs from one pick when the FO does not auto-match', () => {
    const legs = fourLegPairing()
    const catalog = ['John Adam Smith', 'Amy Beta']
    const seeded = seedPreviewCrewNames(legs, catalog)
    expect(seeded['fcv-1']).toBe('SMITH, JOHN')
    expect(seeded['fcv-4']).toBe('SMITH, JOHN.')

    const applied = applyCatalogPilotPick(legs, seeded, new Set(), 'fcv-1', 'John Adam Smith')
    expect(applied.names).toEqual({
      'fcv-1': 'John Adam Smith',
      'fcv-2': 'John Adam Smith',
      'fcv-3': 'John Adam Smith',
      'fcv-4': 'John Adam Smith',
    })
  })

  it('does not override a leg the user already edited', () => {
    const legs = fourLegPairing()
    const seeded = seedPreviewCrewNames(legs, ['John Adam Smith'])
    seeded['fcv-3'] = 'Kept Name'
    const applied = applyCatalogPilotPick(
      legs,
      seeded,
      new Set(['fcv-3']),
      'fcv-1',
      'John Adam Smith'
    )
    expect(applied.names['fcv-1']).toBe('John Adam Smith')
    expect(applied.names['fcv-2']).toBe('John Adam Smith')
    expect(applied.names['fcv-3']).toBe('Kept Name')
    expect(applied.names['fcv-4']).toBe('John Adam Smith')
  })
})
