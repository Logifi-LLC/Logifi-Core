import { describe, expect, it } from 'vitest'
import {
  alignMappedFcvEntry,
  buildAlignmentIndex,
  buildCatalogPersonAlignmentSeeds,
  normalizeCrewNameForMatching,
  normalizeFcvAircraftType,
  resolveCrewName,
} from '../fcvAlignment'

describe('normalizeFcvAircraftType', () => {
  it('maps Republic FLICA EM7 to ERJ-175', () => {
    expect(normalizeFcvAircraftType('EM7')).toBe('ERJ-175')
  })
})

describe('normalizeCrewNameForMatching', () => {
  it('normalizes LAST, FIRST formatting into FIRST LAST key', () => {
    expect(normalizeCrewNameForMatching('PEWTHERS, MAKAYLAJANE')).toBe('MAKAYLAJANE PEWTHERS')
  })
})

describe('buildCatalogPersonAlignmentSeeds', () => {
  it('chooses tag whose normalized form matches entity_id over unrelated tags', () => {
    const seeds = buildCatalogPersonAlignmentSeeds([
      { entity_id: 'jose infante', tag: 'Captain' },
      { entity_id: 'jose infante', tag: 'Jose Infante' },
    ])
    expect(seeds).toEqual([{ entityId: 'jose infante', displayName: 'Jose Infante' }])
  })

  it('falls back to longest tag when none match normalized entity_id', () => {
    const seeds = buildCatalogPersonAlignmentSeeds([
      { entity_id: 'jose infante', tag: 'JI' },
      { entity_id: 'jose infante', tag: 'Foo Bar' },
    ])
    expect(seeds[0]?.displayName).toBe('Foo Bar')
  })
})

describe('resolveCrewName', () => {
  it('prefers catalog canonical name on normalized match', () => {
    const index = buildAlignmentIndex([], {
      catalogPersonNames: ['Makayla Pewthers'],
    })
    const result = resolveCrewName('PEWTHERS, MAKAYLA', index)
    expect(result.strategy).toBe('normalized')
    expect(result.resolvedName).toBe('Makayla Pewthers')
  })

  it('uses catalog display tag when catalog seeds use lowercase entity_id', () => {
    const index = buildAlignmentIndex([], {
      catalogPersons: [{ entityId: 'jose infante', displayName: 'Jose Infante' }],
    })
    const result = resolveCrewName('jose infante', index)
    expect(result.strategy).toBe('normalized')
    expect(result.resolvedName).toBe('Jose Infante')
  })

  it('returns ambiguous for weak fuzzy collisions', () => {
    const index = buildAlignmentIndex([], {
      catalogPersonNames: ['Makayla Pewthers', 'Makalia Pewterson'],
    })
    const result = resolveCrewName('PEWTHERS, MAKA', index)
    expect(['ambiguous', 'unresolved']).toContain(result.strategy)
  })
})

describe('alignMappedFcvEntry', () => {
  it('applies manual override and stores alignment metadata', () => {
    const index = buildAlignmentIndex([], {
      catalogPersonNames: ['Makayla Pewthers'],
    })

    const aligned = alignMappedFcvEntry(
      {
        fcv_flight_id: 'fcv-1',
        date: '2026-04-08',
        role: 'PIC',
        aircraft_category_class: 'AMEL',
        category_class_time: 1.2,
        aircraft_make_model: 'E75S',
        registration: 'N123AB',
        flight_number: null,
        departure: 'KLGA',
        destination: 'KDCA',
        route: null,
        training_elements: 'PEWTHERS, MAKAYLAJANE',
        training_instructor: 'First Officer',
        flight_time: { total: 1.2, pic: 1.2 },
        performance: {},
        oooi: null,
        remarks: null,
        tags: [],
        flight_conditions: ['ifr'],
        is_imported: true,
        import_source: 'fc_view',
        original_entry_date: null,
        import_metadata: null,
      },
      index,
      { crewManualOverrideName: 'Makayla Pewthers' }
    )

    expect(aligned.training_elements).toBe('Makayla Pewthers')
    expect((aligned.import_metadata as any)?.alignment?.crew?.strategy).toBe('manual_override')
  })
})
