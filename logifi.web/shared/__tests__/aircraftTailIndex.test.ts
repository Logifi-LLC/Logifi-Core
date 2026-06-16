import { describe, expect, it } from 'vitest'
import {
  buildAircraftTailIndex,
  consolidateAircraftMakeModelByTail,
  isMakeModelSpellingVariant,
  normalizeAircraftTailKey,
  resolveAircraftByTail,
} from '../aircraftTailIndex'

describe('normalizeAircraftTailKey', () => {
  it('strips spaces and hyphens from registration keys', () => {
    expect(normalizeAircraftTailKey('N-123AB')).toBe('N123AB')
    expect(normalizeAircraftTailKey('n 123ab')).toBe('N123AB')
  })
})

describe('buildAircraftTailIndex', () => {
  it('keeps the most recently updated make/model per tail', () => {
    const index = buildAircraftTailIndex([
      {
        registration: 'N123AB',
        aircraft_make_model: 'DA20-C1',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        registration: 'N123AB',
        aircraft_make_model: 'DA20C1',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ])

    expect(index.get('N123AB')?.aircraftMakeModel).toBe('DA20C1')
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
    ]

    const { entries: consolidated, updatedCount } = consolidateAircraftMakeModelByTail(entries)
    expect(updatedCount).toBe(1)
    expect(consolidated[1]?.aircraftMakeModel).toBe('DA20-C1')
  })
})
