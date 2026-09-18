import { describe, expect, it } from 'vitest'
import {
  formatFewShotPromptBlock,
  sanitizeFewShotValue,
  selectTopFewShotPairs,
} from '../../app/utils/digifiFewShot'

function pair(
  fieldKey: string,
  rawValue: string,
  correctedValue: string,
  sampleCount: number,
  lastCorrectedAt = '2026-05-01T00:00:00Z'
) {
  return {
    field_key: fieldKey,
    raw_value: rawValue,
    corrected_value: correctedValue,
    sample_count: sampleCount,
    last_corrected_at: lastCorrectedAt,
  }
}

describe('selectTopFewShotPairs', () => {
  it('prefers one pair per field before repeating a field', () => {
    const selected = selectTopFewShotPairs(
      [
        pair('identification', 'N12SAB', 'N123AB', 9),
        pair('identification', 'N99XX', 'N99XY', 8),
        pair('destination', 'KMDW', 'MDW', 3),
        pair('aircraft', 'C 172', 'C172', 2),
      ],
      3
    )

    expect(selected.map((item) => item.fieldKey)).toEqual([
      'identification',
      'destination',
      'aircraft',
    ])
    expect(selected[0]?.correctedValue).toBe('N123AB')
  })

  it('fills remaining slots with leftover high-count pairs', () => {
    const selected = selectTopFewShotPairs(
      [
        pair('identification', 'N12SAB', 'N123AB', 9),
        pair('identification', 'N99XX', 'N99XY', 8),
        pair('destination', 'KMDW', 'MDW', 3),
      ],
      3
    )

    expect(selected).toHaveLength(3)
    expect(selected.filter((item) => item.fieldKey === 'identification')).toHaveLength(2)
  })

  it('drops same raw/fixed pairs and empty values', () => {
    const selected = selectTopFewShotPairs(
      [
        pair('identification', 'N123AB', 'N123AB', 5),
        pair('destination', '', 'MDW', 4),
        pair('aircraft', 'C 172', 'C172', 2),
      ],
      8
    )

    expect(selected).toEqual([
      expect.objectContaining({ fieldKey: 'aircraft', rawValue: 'C 172', correctedValue: 'C172' }),
    ])
  })
})

describe('formatFewShotPromptBlock', () => {
  it('returns empty string when there are no pairs', () => {
    expect(formatFewShotPromptBlock([])).toBe('')
  })

  it('formats anonymized raw→fixed examples', () => {
    const block = formatFewShotPromptBlock([
      {
        fieldKey: 'destination',
        rawValue: 'KMDW',
        correctedValue: 'MDW',
        sampleCount: 3,
        lastCorrectedAt: null,
      },
    ])
    expect(block).toContain('Pilot correction examples')
    expect(block).toContain('destination: "KMDW" → "MDW"')
    expect(block).toContain('never invent values')
  })
})

describe('sanitizeFewShotValue', () => {
  it('strips control characters and caps length', () => {
    expect(sanitizeFewShotValue('KMDW\nORD')).toBe('KMDW ORD')
    expect(sanitizeFewShotValue(`N"123"`)).toBe("N'123'")
    expect(sanitizeFewShotValue('A'.repeat(80))).toHaveLength(40)
  })
})
