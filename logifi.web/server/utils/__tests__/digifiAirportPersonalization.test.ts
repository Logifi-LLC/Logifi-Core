import { describe, expect, it, vi } from 'vitest'
import {
  buildDigifiAirportIndex,
  resolveDigifiAirportCode,
  resolveDigifiRouteValue,
} from '../digifiAirportPersonalization'
import type { DigifiCorrectionFeedbackRow } from '../../../app/utils/digifiFeedback'

vi.mock('../locationClassification', () => ({
  classifyLocationCode: (code: string) => {
    const known = new Set(['KSMD', 'KSMP', 'KJFK', 'KLGA', 'VORX'])
    const normalized = code.trim().toUpperCase()
    if (normalized === 'VORX') {
      return { code: normalized, kind: 'navaid' as const }
    }
    if (known.has(normalized)) {
      return { code: normalized, kind: 'airport' as const }
    }
    return { code: normalized, kind: 'unknown' as const }
  },
}))

function historyRow(
  departure: string,
  destination: string,
  route = ''
): {
  departure: string
  destination: string
  route: string
  updated_at: string
} {
  return {
    departure,
    destination,
    route,
    updated_at: '2026-05-26T00:00:00Z',
  }
}

function feedbackRow(
  rawValue: string,
  correctedValue: string,
  sampleCount: number,
  fieldKey = 'departure',
  contextKey = 'dep:KSMD|dest:KSMP|route:'
): DigifiCorrectionFeedbackRow {
  return {
    field_key: fieldKey,
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

describe('Digifi airport personalization', () => {
  it('auto-applies unique one-edit match from history', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [historyRow('KSMD', 'KSMP'), historyRow('KSMD', 'KJFK')],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'destination',
        rawValue: 'K5MP',
        normalizedValue: 'K5MP',
        context: { departure: 'KSMD', destination: 'K5MP' },
      },
      index
    )

    expect(result.strategy).toBe('history_clear_winner')
    expect(result.autoApplied).toBe(true)
    expect(result.resolvedValue).toBe('KSMP')
    expect(result.needsReview).toBe(false)
  })

  it('keeps close airports ambiguous', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [
        historyRow('KSMD', 'KSMP'),
        historyRow('KSMD', 'KSMT'),
        historyRow('KSMD', 'KSMA'),
      ],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'destination',
        rawValue: 'KSMB',
        normalizedValue: 'KSMB',
        context: { departure: 'KSMD', destination: 'KSMB' },
      },
      index
    )

    expect(result.strategy).toBe('ambiguous')
    expect(result.needsReview).toBe(true)
    expect(result.autoApplied).toBe(false)
    expect((result.candidates?.length ?? 0) >= 2).toBe(true)
  })

  it('keeps exact known history airports without auto-apply', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [historyRow('KSMD', 'KSMP')],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'departure',
        rawValue: 'KSMD',
        normalizedValue: 'KSMD',
        context: { departure: 'KSMD', destination: 'KSMP' },
      },
      index
    )

    expect(result.strategy).toBe('known_exact')
    expect(result.needsReview).toBe(false)
    expect(result.autoApplied).toBe(false)
  })

  it('applies learned airport feedback corrections', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [historyRow('KSMD', 'KSMP')],
      catalogRows: [],
      feedbackRows: [feedbackRow('K5MD', 'KSMD', 3)],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'departure',
        rawValue: 'K5MD',
        normalizedValue: 'K5MD',
        context: { departure: 'K5MD', destination: 'KSMP' },
      },
      index
    )

    expect(result.strategy).toBe('feedback_clear_winner')
    expect(result.resolvedValue).toBe('KSMD')
    expect(result.autoApplied).toBe(true)
  })

  it('flags unknown codes not in history or airport DB', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [historyRow('KSMD', 'KSMP')],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'destination',
        rawValue: 'ZZZZ',
        normalizedValue: 'ZZZZ',
        context: { departure: 'KSMD', destination: 'ZZZZ' },
      },
      index
    )

    expect(result.needsReview).toBe(true)
    expect(result.strategy).toBe('raw')
    expect(result.message).toMatch(/not found/i)
  })

  it('does not flag a known airport that is new to the user', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [historyRow('KSMD', 'KSMP')],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'destination',
        rawValue: 'KJFK',
        normalizedValue: 'KJFK',
        context: { departure: 'KSMD', destination: 'KJFK' },
      },
      index
    )

    expect(result.needsReview).toBe(false)
    expect(result.resolvedValue).toBe('KJFK')
  })

  it('resolves route tokens independently', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [historyRow('KSMD', 'KJFK', 'KSMP')],
      catalogRows: [],
      feedbackRows: [],
    })

    const result = resolveDigifiRouteValue(
      {
        rawValue: 'K5MP',
        normalizedValue: 'K5MP',
        context: { departure: 'KSMD', destination: 'KJFK', route: 'K5MP' },
      },
      index
    )

    expect(result.resolvedValue).toBe('KSMP')
    expect(result.autoApplied).toBe(true)
    expect(result.needsReview).toBe(false)
  })

  it('indexes airports from catalog tags', () => {
    const index = buildDigifiAirportIndex({
      historyRows: [],
      catalogRows: [{ entity_id: 'KSMD' }],
      feedbackRows: [],
    })

    const result = resolveDigifiAirportCode(
      {
        fieldKey: 'departure',
        rawValue: 'KSMD',
        normalizedValue: 'KSMD',
        context: { departure: 'KSMD' },
      },
      index
    )

    expect(result.strategy).toBe('known_exact')
  })
})
