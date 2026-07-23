import {
  buildDigifiFeedbackContextFromRow,
  buildDigifiFeedbackContextKey,
  normalizeDigifiAirportKey,
  type DigifiCorrectionFeedbackContext,
  type DigifiCorrectionFeedbackRow,
} from '../../app/utils/digifiFeedback'
import type {
  DigifiScanCellCandidate,
  DigifiScanCellMeta,
  DigifiScanRow,
  DigifiTemplateColumn,
} from '../../app/utils/digifiTypes'
import type { LogbookColumnKey } from '../../app/utils/logbookTypes'
import { splitAirportCodes } from './digifiNormalize'
import { classifyLocationCode } from './locationClassification'

const AIRPORT_FIELD_KEYS: LogbookColumnKey[] = ['departure', 'destination', 'route']

interface AirportHistoryRow {
  departure?: string | null
  destination?: string | null
  route?: string | null
  updated_at?: string | null
}

interface CatalogAirportRow {
  entity_id: string | null
}

interface AirportCandidateRecord {
  value: string
  key: string
  historyCount: number
  catalogCount: number
  lastSeenAt: string | null
}

export interface DigifiAirportIndex {
  airports: AirportCandidateRecord[]
  feedbackByRawContext: Map<string, DigifiCorrectionFeedbackRow[]>
  feedbackByRawFallback: Map<string, DigifiCorrectionFeedbackRow[]>
}

interface RankedAirportCandidate {
  candidate: AirportCandidateRecord
  distance: number
  similarity: number
  score: number
  source: 'history' | 'catalog' | 'feedback'
  feedbackCount: number
}

function keyForFeedback(rawKey: string, contextKey: string): string {
  return `${rawKey}||${contextKey}`
}

function compactScoreNumber(value: number): number {
  return Math.round(value * 1000) / 1000
}

function damerauLevenshtein(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  const dp: number[][] = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0))
  for (let i = 0; i <= al; i++) dp[i][0] = i
  for (let j = 0; j <= bl; j++) dp[0][j] = j
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, dp[i - 2][j - 2] + cost)
      }
      dp[i][j] = best
    }
  }
  return dp[al][bl]
}

function similarityFromDistance(a: string, b: string, distance: number): number {
  return 1 - distance / Math.max(a.length, b.length, 1)
}

function collectAirportTokensFromHistory(row: AirportHistoryRow): string[] {
  return [
    ...splitAirportCodes(row.departure ?? ''),
    ...splitAirportCodes(row.destination ?? ''),
    ...splitAirportCodes(row.route ?? ''),
  ]
}

export function isKnownDigifiLocationCode(code: string): boolean {
  const kind = classifyLocationCode(code).kind
  return kind === 'airport' || kind === 'navaid'
}

export function buildDigifiAirportIndex(options: {
  historyRows: AirportHistoryRow[]
  catalogRows: CatalogAirportRow[]
  feedbackRows: DigifiCorrectionFeedbackRow[]
}): DigifiAirportIndex {
  const airportMap = new Map<string, AirportCandidateRecord>()
  const feedbackByRawContext = new Map<string, DigifiCorrectionFeedbackRow[]>()
  const feedbackByRawFallback = new Map<string, DigifiCorrectionFeedbackRow[]>()

  for (const row of options.historyRows) {
    const tokens = collectAirportTokensFromHistory(row)
    for (const token of tokens) {
      const key = normalizeDigifiAirportKey(token)
      if (!key) continue
      const existing = airportMap.get(key)
      if (existing) {
        existing.historyCount += 1
        if ((row.updated_at ?? '') > (existing.lastSeenAt ?? '')) {
          existing.lastSeenAt = row.updated_at ?? existing.lastSeenAt
        }
        continue
      }
      airportMap.set(key, {
        value: key,
        key,
        historyCount: 1,
        catalogCount: 0,
        lastSeenAt: row.updated_at ?? null,
      })
    }
  }

  for (const row of options.catalogRows) {
    const key = normalizeDigifiAirportKey(row.entity_id ?? '')
    if (!key) continue
    const existing = airportMap.get(key)
    if (existing) {
      existing.catalogCount += 1
      continue
    }
    airportMap.set(key, {
      value: key,
      key,
      historyCount: 0,
      catalogCount: 1,
      lastSeenAt: null,
    })
  }

  for (const row of options.feedbackRows) {
    const fieldKey = (row.field_key ?? '').trim()
    if (!AIRPORT_FIELD_KEYS.includes(fieldKey as LogbookColumnKey)) continue
    const rawKey = row.raw_value_key?.trim() || normalizeDigifiAirportKey(row.raw_value ?? '')
    const correctedKey =
      row.corrected_value_key?.trim() || normalizeDigifiAirportKey(row.corrected_value ?? '')
    if (!rawKey || !correctedKey) continue
    const normalizedRow: DigifiCorrectionFeedbackRow = {
      ...row,
      raw_value_key: rawKey,
      corrected_value_key: correctedKey,
      corrected_value: row.corrected_value?.trim() || correctedKey,
      context_key: row.context_key?.trim() || '',
      sample_count: row.sample_count ?? 1,
    }
    const rawContextKey = keyForFeedback(rawKey, normalizedRow.context_key ?? '')
    feedbackByRawContext.set(rawContextKey, [
      ...(feedbackByRawContext.get(rawContextKey) ?? []),
      normalizedRow,
    ])
    feedbackByRawFallback.set(rawKey, [
      ...(feedbackByRawFallback.get(rawKey) ?? []),
      normalizedRow,
    ])
  }

  return {
    airports: [...airportMap.values()],
    feedbackByRawContext,
    feedbackByRawFallback,
  }
}

function getFeedbackRowsForContext(
  index: DigifiAirportIndex,
  rawKey: string,
  contextKey: string
): DigifiCorrectionFeedbackRow[] {
  const exact = index.feedbackByRawContext.get(keyForFeedback(rawKey, contextKey)) ?? []
  if (exact.length > 0) return exact
  return index.feedbackByRawFallback.get(rawKey) ?? []
}

function pickFeedbackWinner(
  rows: DigifiCorrectionFeedbackRow[],
  minimumCount: number
): DigifiCorrectionFeedbackRow | null {
  if (rows.length === 0) return null
  const grouped = new Map<string, DigifiCorrectionFeedbackRow>()
  for (const row of rows) {
    const correctedKey = row.corrected_value_key?.trim() || ''
    if (!correctedKey) continue
    const existing = grouped.get(correctedKey)
    if (!existing) {
      grouped.set(correctedKey, {
        ...row,
        sample_count: row.sample_count ?? 1,
      })
      continue
    }
    existing.sample_count = (existing.sample_count ?? 1) + (row.sample_count ?? 1)
    if ((row.last_corrected_at ?? '') > (existing.last_corrected_at ?? '')) {
      existing.last_corrected_at = row.last_corrected_at
      existing.corrected_value = row.corrected_value
    }
  }

  const ranked = [...grouped.values()].sort((a, b) => {
    const countDiff = (b.sample_count ?? 1) - (a.sample_count ?? 1)
    if (countDiff !== 0) return countDiff
    return (b.last_corrected_at ?? '').localeCompare(a.last_corrected_at ?? '')
  })
  const best = ranked[0]
  const second = ranked[1]
  if (!best || (best.sample_count ?? 0) < minimumCount) return null
  if (second && (best.sample_count ?? 0) - (second.sample_count ?? 0) < 2) {
    return null
  }
  return best
}

function rankAirportCandidates(
  normalizedValue: string,
  fieldKey: LogbookColumnKey,
  context: DigifiCorrectionFeedbackContext,
  index: DigifiAirportIndex
): RankedAirportCandidate[] {
  const contextKey = buildDigifiFeedbackContextKey(fieldKey, context)
  const feedbackRows = getFeedbackRowsForContext(index, normalizedValue, contextKey)
  const feedbackByCandidateKey = new Map<string, number>()
  for (const row of feedbackRows) {
    const correctedKey = row.corrected_value_key?.trim() || ''
    if (!correctedKey) continue
    feedbackByCandidateKey.set(
      correctedKey,
      (feedbackByCandidateKey.get(correctedKey) ?? 0) + (row.sample_count ?? 1)
    )
  }

  return index.airports
    .map((candidate) => {
      const distance = damerauLevenshtein(normalizedValue, candidate.key)
      if (distance > 2) return null
      const similarity = similarityFromDistance(normalizedValue, candidate.key, distance)
      const feedbackCount = feedbackByCandidateKey.get(candidate.key) ?? 0
      const score =
        similarity +
        Math.min(0.18, feedbackCount * 0.06) +
        Math.min(0.08, candidate.historyCount * 0.015) +
        (candidate.catalogCount > 0 ? 0.02 : 0)

      return {
        candidate,
        distance,
        similarity,
        score,
        source: feedbackCount > 0 ? 'feedback' : candidate.historyCount > 0 ? 'history' : 'catalog',
        feedbackCount,
      } satisfies RankedAirportCandidate
    })
    .filter((candidate): candidate is RankedAirportCandidate => candidate != null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.distance !== b.distance) return a.distance - b.distance
      return b.feedbackCount - a.feedbackCount
    })
}

function toCellCandidate(ranked: RankedAirportCandidate): DigifiScanCellCandidate {
  return {
    value: ranked.candidate.value,
    score: compactScoreNumber(ranked.score),
    distance: ranked.distance,
    source: ranked.source,
    sampleCount: ranked.feedbackCount > 0 ? ranked.feedbackCount : ranked.candidate.historyCount,
  }
}

export function resolveDigifiAirportCode(options: {
  fieldKey: 'departure' | 'destination' | 'route'
  rawValue: string
  normalizedValue: string
  context: DigifiCorrectionFeedbackContext
}, index: DigifiAirportIndex): DigifiScanCellMeta {
  const rawValue = options.rawValue.trim()
  const normalizedValue = normalizeDigifiAirportKey(
    options.normalizedValue || options.rawValue
  )
  const contextKey = buildDigifiFeedbackContextKey(options.fieldKey, options.context)

  if (!normalizedValue) {
    return {
      fieldKey: options.fieldKey,
      rawValue,
      resolvedValue: '',
      strategy: 'raw',
      confidence: 'low',
      autoApplied: false,
      needsReview: false,
      contextKey,
    }
  }

  const feedbackRows = getFeedbackRowsForContext(index, normalizedValue, contextKey)
  const exactFeedbackWinner = pickFeedbackWinner(
    feedbackRows.filter((row) => (row.context_key?.trim() || '') === contextKey),
    2
  )
  const feedbackWinner = exactFeedbackWinner ?? pickFeedbackWinner(feedbackRows, 3)
  const exactKnown = index.airports.find((candidate) => candidate.key === normalizedValue)

  if (feedbackWinner) {
    const correctedValue =
      feedbackWinner.corrected_value?.trim() ||
      feedbackWinner.corrected_value_key?.trim() ||
      normalizedValue
    return {
      fieldKey: options.fieldKey,
      rawValue,
      resolvedValue: correctedValue,
      strategy:
        feedbackWinner.corrected_value_key === normalizedValue
          ? 'feedback_exact'
          : 'feedback_clear_winner',
      confidence: 'high',
      autoApplied: feedbackWinner.corrected_value_key !== normalizedValue,
      needsReview: false,
      contextKey,
      candidates: [
        {
          value: correctedValue,
          score: 1,
          source: 'feedback',
          sampleCount: feedbackWinner.sample_count ?? 1,
        },
      ],
      message:
        feedbackWinner.corrected_value_key !== normalizedValue
          ? `Applied a learned airport correction for "${rawValue || normalizedValue}".`
          : undefined,
    }
  }

  if (exactKnown) {
    return {
      fieldKey: options.fieldKey,
      rawValue,
      resolvedValue: exactKnown.value,
      strategy: 'known_exact',
      confidence: 'high',
      autoApplied: false,
      needsReview: false,
      contextKey,
    }
  }

  const ranked = rankAirportCandidates(
    normalizedValue,
    options.fieldKey,
    options.context,
    index
  )
  const best = ranked[0]
  const second = ranked[1]

  if (
    best &&
    best.distance === 1 &&
    (!second || second.distance >= 2) &&
    best.score - (second?.score ?? 0) >= 0.08
  ) {
    return {
      fieldKey: options.fieldKey,
      rawValue,
      resolvedValue: best.candidate.value,
      strategy: best.feedbackCount > 0 ? 'feedback_clear_winner' : 'history_clear_winner',
      confidence: 'medium',
      autoApplied: true,
      needsReview: false,
      contextKey,
      candidates: ranked.slice(0, 3).map(toCellCandidate),
      message: `Auto-applied airport "${best.candidate.value}" as the only clear match for "${rawValue || normalizedValue}".`,
    }
  }

  if (best && ranked.length > 0) {
    return {
      fieldKey: options.fieldKey,
      rawValue,
      resolvedValue: normalizedValue,
      strategy: 'ambiguous',
      confidence: 'low',
      autoApplied: false,
      needsReview: true,
      contextKey,
      candidates: ranked.slice(0, 5).map(toCellCandidate),
      message: `Review this airport. Multiple likely locations match "${rawValue || normalizedValue}".`,
    }
  }

  // Not in user history/catalog and not a known airport/navaid → flag for review.
  if (!isKnownDigifiLocationCode(normalizedValue)) {
    return {
      fieldKey: options.fieldKey,
      rawValue,
      resolvedValue: normalizedValue,
      strategy: 'raw',
      confidence: 'low',
      autoApplied: false,
      needsReview: true,
      contextKey,
      message: `Review this airport code — "${normalizedValue}" is not in your history and was not found in the airport catalog.`,
    }
  }

  return {
    fieldKey: options.fieldKey,
    rawValue,
    resolvedValue: normalizedValue,
    strategy: 'raw',
    confidence: 'low',
    autoApplied: false,
    needsReview: false,
    contextKey,
  }
}

/** Resolve a route cell token-by-token; flag the cell if any token needs review. */
export function resolveDigifiRouteValue(options: {
  rawValue: string
  normalizedValue: string
  context: DigifiCorrectionFeedbackContext
}, index: DigifiAirportIndex): DigifiScanCellMeta {
  const rawValue = options.rawValue.trim()
  const tokens = splitAirportCodes(options.normalizedValue || options.rawValue)
  const contextKey = buildDigifiFeedbackContextKey('route', options.context)

  if (tokens.length === 0) {
    const normalized = (options.normalizedValue || options.rawValue).trim()
    return {
      fieldKey: 'route',
      rawValue,
      resolvedValue: normalized,
      strategy: 'raw',
      confidence: 'low',
      autoApplied: false,
      needsReview: false,
      contextKey,
    }
  }

  const resolvedTokens: string[] = []
  const candidates: DigifiScanCellCandidate[] = []
  let needsReview = false
  let autoApplied = false
  let anyChanged = false
  const messages: string[] = []

  for (const token of tokens) {
    const meta = resolveDigifiAirportCode(
      {
        fieldKey: 'route',
        rawValue: token,
        normalizedValue: token,
        context: options.context,
      },
      index
    )
    resolvedTokens.push(meta.resolvedValue || token)
    if (meta.autoApplied) autoApplied = true
    if ((meta.resolvedValue || token) !== token) anyChanged = true
    if (meta.needsReview) {
      needsReview = true
      if (meta.message) messages.push(meta.message)
    }
    for (const candidate of meta.candidates ?? []) {
      if (!candidates.some((c) => c.value === candidate.value)) {
        candidates.push(candidate)
      }
    }
  }

  const resolvedValue = resolvedTokens.join(' ')
  return {
    fieldKey: 'route',
    rawValue,
    resolvedValue,
    strategy: needsReview ? 'ambiguous' : autoApplied ? 'history_clear_winner' : anyChanged ? 'known_exact' : 'raw',
    confidence: needsReview ? 'low' : autoApplied ? 'medium' : 'high',
    autoApplied: autoApplied && !needsReview,
    needsReview,
    contextKey,
    candidates: candidates.slice(0, 5),
    message: messages[0],
  }
}

export async function loadCatalogAirportRows(
  supabase: any,
  userId: string
): Promise<CatalogAirportRow[]> {
  const { data, error } = await (supabase.from('catalog_entity_tags') as any)
    .select('entity_id')
    .eq('user_id', userId)
    .eq('entity_type', 'airport')

  if (error) throw error
  return (data ?? []) as CatalogAirportRow[]
}

export async function loadAirportCorrectionFeedbackRows(
  supabase: any,
  userId: string
): Promise<DigifiCorrectionFeedbackRow[]> {
  const { data, error } = await (supabase.from('digifi_correction_feedback') as any)
    .select(
      'field_key, raw_value, raw_value_key, corrected_value, corrected_value_key, context_key, context, sample_count, last_corrected_at'
    )
    .eq('user_id', userId)
    .in('field_key', AIRPORT_FIELD_KEYS)

  if (error) throw error
  return (data ?? []) as DigifiCorrectionFeedbackRow[]
}

export function personalizeDigifiAirportCells(options: {
  rows: DigifiScanRow[]
  columns: DigifiTemplateColumn[]
  index: DigifiAirportIndex
}): { reviewMessages: string[]; reviewRequiredCount: number } {
  const reviewMessages: string[] = []
  let reviewRequiredCount = 0

  const airportColumns = options.columns.filter(
    (column) =>
      column.fieldKey === 'departure' ||
      column.fieldKey === 'destination' ||
      column.fieldKey === 'route'
  )
  if (airportColumns.length === 0) {
    return { reviewMessages, reviewRequiredCount }
  }

  for (const row of options.rows) {
    const context = buildDigifiFeedbackContextFromRow(row, options.columns)

    for (const column of airportColumns) {
      const fieldKey = column.fieldKey as 'departure' | 'destination' | 'route'
      const currentValue = row.cells[column.id] ?? ''
      if (!currentValue.trim()) continue

      const meta =
        fieldKey === 'route'
          ? resolveDigifiRouteValue(
              {
                rawValue: row.cellMeta?.[column.id]?.rawValue ?? currentValue,
                normalizedValue: currentValue,
                context,
              },
              options.index
            )
          : resolveDigifiAirportCode(
              {
                fieldKey,
                rawValue: row.cellMeta?.[column.id]?.rawValue ?? currentValue,
                normalizedValue: currentValue,
                context,
              },
              options.index
            )

      row.cells[column.id] = meta.resolvedValue
      row.cellMeta = {
        ...(row.cellMeta ?? {}),
        [column.id]: meta,
      }

      if (meta.needsReview) {
        reviewRequiredCount += 1
        const candidatePreview = (meta.candidates ?? [])
          .slice(0, 3)
          .map((candidate) => candidate.value)
          .join(', ')
        const label =
          fieldKey === 'departure' ? 'From' : fieldKey === 'destination' ? 'To' : 'Route'
        reviewMessages.push(
          `Row ${row.rowIndex + 1}: review ${label} "${meta.rawValue || currentValue}"${candidatePreview ? ` (${candidatePreview})` : ''}.`
        )
      }
    }
  }

  return { reviewMessages, reviewRequiredCount }
}
