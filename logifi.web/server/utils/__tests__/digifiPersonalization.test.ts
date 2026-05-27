import { describe, expect, it } from 'vitest'
import {
  buildDigifiRegistrationIndex,
  resolveDigifiRegistration,
  type DigifiCorrectionFeedbackRow,
} from '../digifiPersonalization'

function buildHistoryRow(
  registration: string,
  aircraftMakeModel = 'C172'
): {
  registration: string
  aircraft_make_model: string
  aircraft_category_class: string
  updated_at: string
} {
  return {
    registration,
    aircraft_make_model: aircraftMakeModel,
    aircraft_category_class: 'ASEL',
    updated_at: '2026-05-26T00:00:00Z',
  }
}

function buildFeedbackRow(
  rawValue: string,
  correctedValue: string,
  sampleCount: number,
  contextKey = 'aircraft:C172|category:ASEL'
): DigifiCorrectionFeedbackRow {
  return {
    field_key: 'identification',
    raw_value: rawValue,
    raw_value_key: rawValue,
    corrected_value: correctedValue,
    corrected_value_key: correctedValue,
    context_key: contextKey,
    context: {},
    sample_count: sampleCount,
    last_corrected_at: '2026-05-26T00:00:00Z',
  }
}

describe('Digifi registration personalization', () => {
  it('keeps close one-character fleets ambiguous', () => {
    const index = buildDigifiRegistrationIndex({
      historyRows: [
        buildHistoryRow('N651PA'),
        buildHistoryRow('N652PA'),
        buildHistoryRow('N653PA'),
        buildHistoryRow('N654PA'),
      ],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiRegistration(
      {
        rawValue: 'N655PA',
        normalizedValue: 'N655PA',
        context: {
          aircraftMakeModel: 'C172',
          aircraftCategoryClass: 'ASEL',
        },
      },
      index
    )

    expect(result.strategy).toBe('ambiguous')
    expect(result.autoApplied).toBe(false)
    expect(result.needsReview).toBe(true)
    expect(result.candidates?.map((candidate) => candidate.value)).toEqual([
      'N651PA',
      'N652PA',
      'N653PA',
      'N654PA',
    ])
  })

  it('auto-applies a single clear history winner', () => {
    const index = buildDigifiRegistrationIndex({
      historyRows: [
        buildHistoryRow('N5724J'),
        buildHistoryRow('N901LF', 'DA42'),
      ],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiRegistration(
      {
        rawValue: 'N5724S',
        normalizedValue: 'N5724S',
        context: {
          aircraftMakeModel: 'C172',
          aircraftCategoryClass: 'ASEL',
        },
      },
      index
    )

    expect(result.strategy).toBe('history_clear_winner')
    expect(result.autoApplied).toBe(true)
    expect(result.resolvedValue).toBe('N5724J')
    expect(result.needsReview).toBe(false)
  })

  it('uses strong exact feedback memory when it has a clear winner', () => {
    const index = buildDigifiRegistrationIndex({
      historyRows: [buildHistoryRow('N5724J')],
      catalogRows: [],
      feedbackRows: [buildFeedbackRow('N5724S', 'N5724J', 3)],
    })

    const result = resolveDigifiRegistration(
      {
        rawValue: 'N5724S',
        normalizedValue: 'N5724S',
        context: {
          aircraftMakeModel: 'C172',
          aircraftCategoryClass: 'ASEL',
        },
      },
      index
    )

    expect(result.strategy).toBe('feedback_clear_winner')
    expect(result.autoApplied).toBe(true)
    expect(result.resolvedValue).toBe('N5724J')
  })

  it('does not let conflicting feedback override ambiguity safeguards', () => {
    const index = buildDigifiRegistrationIndex({
      historyRows: [buildHistoryRow('N5724J'), buildHistoryRow('N5724L')],
      catalogRows: [],
      feedbackRows: [
        buildFeedbackRow('N5724S', 'N5724J', 3),
        buildFeedbackRow('N5724S', 'N5724L', 2),
      ],
    })

    const result = resolveDigifiRegistration(
      {
        rawValue: 'N5724S',
        normalizedValue: 'N5724S',
        context: {
          aircraftMakeModel: 'C172',
          aircraftCategoryClass: 'ASEL',
        },
      },
      index
    )

    expect(result.strategy).toBe('ambiguous')
    expect(result.autoApplied).toBe(false)
    expect(result.needsReview).toBe(true)
  })
})
