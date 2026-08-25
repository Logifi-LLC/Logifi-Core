import { describe, expect, it } from 'vitest'
import {
  applyCatalogFamilyToFcvPreview,
  buildAircraftTailIndex,
  buildTailCatalogFamilyMap,
  consolidateAircraftMakeModelByTail,
  effectiveCatalogFamilyKey,
  isMakeModelSpellingVariant,
  normalizeAircraftTailKey,
  resolveAircraftByTail,
} from '../aircraftTailIndex'
import { UNKNOWN_AIRCRAFT_FAMILY } from '../catalogAircraftFamily'

describe('normalizeAircraftTailKey', () => {
  it('strips spaces and hyphens from registration keys', () => {
    expect(normalizeAircraftTailKey('N-123AB')).toBe('N123AB')
    expect(normalizeAircraftTailKey('n 123ab')).toBe('N123AB')
  })
})

describe('buildTailCatalogFamilyMap', () => {
  it('uses the most common make/model per tail, not the most recent', () => {
    const map = buildTailCatalogFamilyMap([
      {
        registration: 'N123AB',
        aircraft_make_model: 'C172',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraft_make_model: 'C172N',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraft_make_model: 'C172',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ])

    expect(map.get('N123AB')).toBe('C172')
  })
})

describe('buildAircraftTailIndex', () => {
  it('uses mode make/model per tail for canonical identity', () => {
    const index = buildAircraftTailIndex([
      {
        registration: 'N123AB',
        aircraft_make_model: 'DA20-C1',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraft_make_model: 'DA20C1',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraft_make_model: 'DA20-C1',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ])

    expect(index.get('N123AB')?.aircraftMakeModel).toBe('DA20-C1')
  })
})

describe('resolveAircraftByTail', () => {
  it('returns canonical make/model for known tails when OCR spelling differs', () => {
    const index = buildAircraftTailIndex([
      {
        registration: 'N123AB',
        aircraft_make_model: 'DA20-C1',
        aircraft_category_class: 'ASEL',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ])

    const resolved = resolveAircraftByTail('N123AB', 'DA-20-C1', index)
    expect(resolved.fromTail).toBe(true)
    expect(resolved.aircraftMakeModel).toBe('DA20-C1')
    expect(resolved.aircraftCategoryClass).toBe('ASEL')
  })

  it('passes through scanned make/model for unknown tails', () => {
    const index = buildAircraftTailIndex([])
    const resolved = resolveAircraftByTail('N999ZZ', 'DA-20-C1', index)
    expect(resolved.fromTail).toBe(false)
    expect(resolved.aircraftMakeModel).toBe('DA-20-C1')
  })
})

describe('isMakeModelSpellingVariant', () => {
  it('treats hyphen and punctuation differences as variants', () => {
    expect(isMakeModelSpellingVariant('DA-20-C1', 'DA20C1')).toBe(true)
    expect(isMakeModelSpellingVariant('DA20-C1', 'DA20C1')).toBe(true)
  })
})

describe('consolidateAircraftMakeModelByTail', () => {
  it('rewrites older spelling variants to the canonical tail make/model', () => {
    const entries = [
      {
        id: '1',
        registration: 'N123AB',
        aircraftMakeModel: 'DA20-C1',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: '2',
        registration: 'N123AB',
        aircraftMakeModel: 'DA-20-C1',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '3',
        registration: 'N123AB',
        aircraftMakeModel: 'DA20-C1',
        updatedAt: '2026-02-01T00:00:00Z',
      },
    ]

    const { entries: consolidated, updatedCount } = consolidateAircraftMakeModelByTail(entries)
    expect(updatedCount).toBeGreaterThanOrEqual(1)
    expect(consolidated.every((e) => e.aircraftMakeModel === 'DA20-C1')).toBe(true)
  })
})

describe('effectiveCatalogFamilyKey', () => {
  it('maps mixed C172 variant entries for the same tail to one catalog family', () => {
    const tailFamilyMap = buildTailCatalogFamilyMap([
      {
        registration: 'N123AB',
        aircraftMakeModel: 'C172',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraftMakeModel: 'C172N',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraftMakeModel: 'C172',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ])

    expect(
      effectiveCatalogFamilyKey(
        { registration: 'N123AB', aircraftMakeModel: 'C172N' },
        tailFamilyMap
      )
    ).toBe('C172')
    expect(
      effectiveCatalogFamilyKey(
        { registration: 'N123AB', aircraftMakeModel: 'C172' },
        tailFamilyMap
      )
    ).toBe('C172')
  })

  it('merges multiple tails into one family when each tail mode is C172', () => {
    const tailFamilyMap = buildTailCatalogFamilyMap([
      { registration: 'N111AA', aircraftMakeModel: 'C172' },
      { registration: 'N222BB', aircraftMakeModel: 'C172' },
      { registration: 'N333CC', aircraftMakeModel: 'C172N' },
      { registration: 'N333CC', aircraftMakeModel: 'C172' },
      { registration: 'N333CC', aircraftMakeModel: 'C172' },
    ])

    const families = new Set([
      effectiveCatalogFamilyKey({ registration: 'N111AA', aircraftMakeModel: 'C172' }, tailFamilyMap),
      effectiveCatalogFamilyKey({ registration: 'N222BB', aircraftMakeModel: 'C172' }, tailFamilyMap),
      effectiveCatalogFamilyKey({ registration: 'N333CC', aircraftMakeModel: 'C172N' }, tailFamilyMap),
    ])

    expect(families.size).toBe(1)
    expect(families.has('C172')).toBe(true)
  })

  it('keeps a new tail in its own family when only C172N is known', () => {
    const tailFamilyMap = buildTailCatalogFamilyMap([
      {
        registration: 'N999ZZ',
        aircraftMakeModel: 'C172N',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ])

    expect(
      effectiveCatalogFamilyKey(
        { registration: 'N999ZZ', aircraftMakeModel: 'C172N' },
        tailFamilyMap
      )
    ).toBe('C172N')
  })

  it('groups registration-only entries under Unknown aircraft', () => {
    const tailFamilyMap = buildTailCatalogFamilyMap([
      {
        registration: 'N855RW',
        aircraftMakeModel: '',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ])

    expect(
      effectiveCatalogFamilyKey(
        { registration: 'N855RW', aircraftMakeModel: '' },
        tailFamilyMap
      )
    ).toBe(UNKNOWN_AIRCRAFT_FAMILY)
  })
})

describe('applyCatalogFamilyToFcvPreview', () => {
  it('rewrites known tails to the catalog family', () => {
    const flights = applyCatalogFamilyToFcvPreview(
      [
        {
          registration: 'N-421YX',
          aircraft_make_model: 'EMBRAER 175',
        },
      ],
      { N421YX: 'ERJ170/175' }
    )

    expect(flights[0]?.aircraft_make_model).toBe('ERJ170/175')
  })

  it('leaves unknown tails as the vendor type', () => {
    const flights = applyCatalogFamilyToFcvPreview(
      [
        {
          registration: 'N999ZZ',
          aircraft_make_model: 'EMBRAER 175',
        },
      ],
      { N421YX: 'ERJ170/175' }
    )

    expect(flights[0]?.aircraft_make_model).toBe('EMBRAER 175')
  })
})
