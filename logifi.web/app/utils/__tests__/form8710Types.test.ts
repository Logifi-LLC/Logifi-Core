import { describe, expect, it } from 'vitest'
import { isTrainingDevice } from '../form8710Types'

function deviceEntry(overrides: {
  aircraftMakeModel?: string
  aircraftCategoryClass?: string
  trainingElements?: string
} = {}) {
  return {
    aircraftMakeModel: 'C-172',
    aircraftCategoryClass: 'ASEL',
    trainingElements: '',
    ...overrides,
  }
}

describe('isTrainingDevice', () => {
  it('matches device tokens on word boundaries in make/model and category', () => {
    expect(isTrainingDevice(deviceEntry({ aircraftMakeModel: 'Redbird FMX' }))).toBe(true)
    expect(isTrainingDevice(deviceEntry({ aircraftMakeModel: 'Frasca GAT' }))).toBe(true)
    expect(isTrainingDevice(deviceEntry({ aircraftCategoryClass: 'ATD' }))).toBe(true)
    expect(isTrainingDevice(deviceEntry({ aircraftCategoryClass: 'FFS' }))).toBe(true)
    expect(isTrainingDevice(deviceEntry({ aircraftCategoryClass: 'FTD' }))).toBe(true)
  })

  it('does not treat lesson-text substrings as device tokens', () => {
    const falsePositives = [
      'XC navigation',
      'navigator',
      'aggregate',
      'Simon',
      'Simmons',
      'precision approach',
      'elite maneuvers',
    ]
    for (const trainingElements of falsePositives) {
      expect(isTrainingDevice(deviceEntry({ trainingElements }))).toBe(false)
    }
  })

  it('ignores trainingElements unless includeTrainingElements is set', () => {
    expect(
      isTrainingDevice(deviceEntry({ trainingElements: 'SIM session' }))
    ).toBe(false)
    expect(
      isTrainingDevice(deviceEntry({ trainingElements: 'SIM session' }), {
        includeTrainingElements: true,
      })
    ).toBe(true)
    expect(
      isTrainingDevice(deviceEntry({ trainingElements: 'XC navigation' }), {
        includeTrainingElements: true,
      })
    ).toBe(false)
  })
})
