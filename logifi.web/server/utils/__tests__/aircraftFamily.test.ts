import { describe, expect, it } from 'vitest'
import {
  mergeEntryTagsWithFamilyTags,
  normalizeAircraftFamily,
} from '../aircraftFamily'

describe('normalizeAircraftFamily', () => {
  it('normalizes ERJ/EMB variants to canonical family', () => {
    expect(normalizeAircraftFamily('ERJ 170-200 LR')).toBe('ERJ-170')
    expect(normalizeAircraftFamily('EMB-170')).toBe('ERJ-170')
    expect(normalizeAircraftFamily('ERJ175')).toBe('ERJ-175')
  })
})

describe('mergeEntryTagsWithFamilyTags', () => {
  it('adds family tags to imported entry tags', () => {
    const familyTagsById = new Map<string, string[]>([['ERJ-170', ['Turbine']]])
    const merged = mergeEntryTagsWithFamilyTags([], 'ERJ-170', familyTagsById)
    expect(merged).toEqual(['Turbine'])
  })

  it('preserves existing FCV tags and dedupes overlap', () => {
    const familyTagsById = new Map<string, string[]>([
      ['ERJ-170', ['Turbine', 'Deadhead', '  Turbine  ']],
    ])
    const merged = mergeEntryTagsWithFamilyTags(
      ['Deadhead', 'Checkride'],
      'ERJ 170-200 LR',
      familyTagsById
    )
    expect(merged).toEqual(['Deadhead', 'Checkride', 'Turbine'])
  })
})
