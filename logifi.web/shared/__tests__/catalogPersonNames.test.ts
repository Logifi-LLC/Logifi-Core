import { describe, expect, it } from 'vitest'
import {
  buildCatalogPersonAlignmentSeeds,
  catalogContainsPersonName,
  isPersonCatalogNameMarker,
  listCatalogPersonDisplayNames,
  normalizeCrewNameForMatching,
  tagsExcludingPersonNameMarker,
} from '../catalogPersonNames'

describe('normalizeCrewNameForMatching', () => {
  it('normalizes last, first to first last', () => {
    expect(normalizeCrewNameForMatching('PEWTHERS, MAKAYLAJANE')).toBe('MAKAYLAJANE PEWTHERS')
  })
})

describe('buildCatalogPersonAlignmentSeeds', () => {
  it('picks the longest matching display tag for an entity', () => {
    const seeds = buildCatalogPersonAlignmentSeeds([
      { entity_id: 'jose infante', tag: 'crew' },
      { entity_id: 'jose infante', tag: 'Jose Infante' },
    ])
    expect(seeds).toEqual([{ entityId: 'jose infante', displayName: 'Jose Infante' }])
  })

  it('falls back to entity_id when no tags exist', () => {
    const seeds = buildCatalogPersonAlignmentSeeds([{ entity_id: 'jane doe', tag: '' }])
    expect(seeds[0]?.displayName).toBe('jane doe')
  })
})

describe('listCatalogPersonDisplayNames', () => {
  it('returns sorted unique display names', () => {
    const names = listCatalogPersonDisplayNames([
      { entity_id: 'zoe', tag: 'Zoe Alpha' },
      { entity_id: 'amy', tag: 'Amy Beta' },
    ])
    expect(names).toEqual(['Amy Beta', 'Zoe Alpha'])
  })
})

describe('isPersonCatalogNameMarker', () => {
  it('matches the person name case-insensitively after trim', () => {
    expect(isPersonCatalogNameMarker('Jane Doe', ' jane doe ')).toBe(true)
    expect(isPersonCatalogNameMarker('Jane Doe', 'IOE')).toBe(false)
  })

  it('does not treat the crew fallback as the name marker', () => {
    expect(isPersonCatalogNameMarker('Jane Doe', 'crew')).toBe(false)
    expect(isPersonCatalogNameMarker('Crew', 'crew')).toBe(false)
  })
})

describe('tagsExcludingPersonNameMarker', () => {
  it('hides the own-name tag and keeps user tags and the crew fallback', () => {
    expect(
      tagsExcludingPersonNameMarker('Jane Doe', ['Jane Doe', 'crew', 'IOE']),
    ).toEqual(['crew', 'IOE'])
  })
})

describe('catalogContainsPersonName', () => {
  it('matches names case-insensitively with comma order normalization', () => {
    const names = ['Jose Infante']
    expect(catalogContainsPersonName(names, 'INFANTE, JOSE')).toBe(true)
    expect(catalogContainsPersonName(names, 'Unknown Person')).toBe(false)
  })
})
