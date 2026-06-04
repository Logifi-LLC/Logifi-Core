import {
  buildDigifiFeedbackContextFromRow,
  buildDigifiFeedbackContextKey,
  normalizeDigifiAircraftText,
  normalizeDigifiFeedbackValue,
  normalizeDigifiRegistrationKey,
  type DigifiCorrectionFeedbackContext,
} from '../../app/utils/digifiFeedback'
import type {
  DigifiScanCellCandidate,
  DigifiScanCellMeta,
  DigifiScanRow,
  DigifiTemplateColumn,
} from '../../app/utils/digifiTypes'

interface LogEntryPersonalizationRow {
  registration: string | null
  aircraft_make_model: string | null
  aircraft_category_class: string | null
  updated_at?: string | null
}

interface CatalogAircraftRow {
  entity_id: string | null
}

export interface DigifiCorrectionFeedbackRow {
  field_key: string | null
  raw_value: string | null
  raw_value_key: string | null
  corrected_value: string | null
  corrected_value_key: string | null
  context_key: string | null
  context: Record<string, unknown> | null
  sample_count: number | null
  last_corrected_at: string | null
}

interface RegistrationCandidateRecord {
  value: string
  key: string
  aircraftMakeModel: string | null
  aircraftCategoryClass: string | null
  historyCount: number
  catalogCount: number
  lastSeenAt: string | null
}

export interface DigifiRegistrationIndex {
  registrations: RegistrationCandidateRecord[]
  feedbackByRawContext: Map<string, DigifiCorrectionFeedbackRow[]>
  feedbackByRawFallback: Map<string, DigifiCorrectionFeedbackRow[]>
}

interface RankedCandidate {
  candidate: RegistrationCandidateRecord
  distance: number
  similarity: number
  score: number
  source: 'history' | 'catalog' | 'feedback'
  feedbackCount: number
  contextMatch: boolean
}

export interface ResolveDigifiRegistrationOptions {
  rawValue: string
  normalizedValue: string
  context: DigifiCorrectionFeedbackContext
}

export interface DigifiPersonalizationResult {
  rows: DigifiScanRow[]
  reviewMessages: string[]
  reviewRequiredCount: number
}

const HISTORY_BATCH_SIZE = 1000
const FEEDBACK_FIELD_KEY = 'identification'

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
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
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

function normalizeModelForMatching(value: string | null | undefined): string {
  if (!value) return ''
  return normalizeDigifiAircraftText(value).replace(/[^A-Z0-9]/g, '')
}

function candidateContextMatches(
  candidate: RegistrationCandidateRecord,
  context: DigifiCorrectionFeedbackContext
): boolean {
  const scannedModel = normalizeModelForMatching(context.aircraftMakeModel)
  if (!scannedModel) return false
  const candidateModel = normalizeModelForMatching(candidate.aircraftMakeModel)
  if (!candidateModel) return false
  return (
    scannedModel === candidateModel ||
    scannedModel.includes(candidateModel) ||
    candidateModel.includes(scannedModel)
  )
}

function buildBaseCellMetaRows(
  rawRows: DigifiScanRow[],
  normalizedRows: DigifiScanRow[],
  columns: DigifiTemplateColumn[]
): DigifiScanRow[] {
  const columnById = new Map(columns.map((column) => [column.id, column]))
  const rawByRowIndex = new Map(rawRows.map((row) => [row.rowIndex, row]))

  return normalizedRows.map((row) => {
    const rawRow = rawByRowIndex.get(row.rowIndex)
    const cellMeta: Record<string, DigifiScanCellMeta> = {}

    for (const [columnId, value] of Object.entries(row.cells)) {
      const normalizedValue = (value ?? '').trim()
      const rawValue = rawRow?.cells?.[columnId] ?? normalizedValue
      if (!normalizedValue && !rawValue.trim()) continue
      const column = columnById.get(columnId)
      cellMeta[columnId] = {
        fieldKey: column?.fieldKey ?? null,
        rawValue,
        resolvedValue: normalizedValue,
        strategy: 'raw',
        confidence: 'low',
        autoApplied: false,
        needsReview: false,
      }
    }

    return {
      rowIndex: row.rowIndex,
      cells: { ...row.cells },
      tags: row.tags ? [...row.tags] : [],
      cellMeta,
    }
  })
}

async function loadRegistrationHistory(
  supabase: any,
  userId: string
): Promise<LogEntryPersonalizationRow[]> {
  const allRows: LogEntryPersonalizationRow[] = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const to = from + HISTORY_BATCH_SIZE - 1
    const { data, error } = await (supabase
      .from('log_entries') as any)
      .select('registration, aircraft_make_model, aircraft_category_class, updated_at')
      .eq('user_id', userId)
      .range(from, to)

    if (error) {
      throw error
    }

    const batch = (data ?? []) as LogEntryPersonalizationRow[]
    allRows.push(...batch)
    hasMore = batch.length >= HISTORY_BATCH_SIZE
    from += HISTORY_BATCH_SIZE
  }

  return allRows
}

async function loadCatalogAircraftRows(
  supabase: any,
  userId: string
): Promise<CatalogAircraftRow[]> {
  const { data, error } = await (supabase
    .from('catalog_entity_tags') as any)
    .select('entity_id')
    .eq('user_id', userId)
    .eq('entity_type', 'aircraft')

  if (error) {
    throw error
  }

  return (data ?? []) as CatalogAircraftRow[]
}

async function loadCorrectionFeedbackRows(
  supabase: any,
  userId: string
): Promise<DigifiCorrectionFeedbackRow[]> {
  const { data, error } = await (supabase
    .from('digifi_correction_feedback') as any)
    .select('field_key, raw_value, raw_value_key, corrected_value, corrected_value_key, context_key, context, sample_count, last_corrected_at')
    .eq('user_id', userId)
    .eq('field_key', FEEDBACK_FIELD_KEY)

  if (error) {
    throw error
  }

  return (data ?? []) as DigifiCorrectionFeedbackRow[]
}

export function buildDigifiRegistrationIndex(options: {
  historyRows: LogEntryPersonalizationRow[]
  catalogRows: CatalogAircraftRow[]
  feedbackRows: DigifiCorrectionFeedbackRow[]
}): DigifiRegistrationIndex {
  const registrationMap = new Map<string, RegistrationCandidateRecord>()
  const feedbackByRawContext = new Map<string, DigifiCorrectionFeedbackRow[]>()
  const feedbackByRawFallback = new Map<string, DigifiCorrectionFeedbackRow[]>()

  for (const row of options.historyRows) {
    const key = normalizeDigifiRegistrationKey(row.registration ?? '')
    if (!key) continue
    const existing = registrationMap.get(key)
    if (existing) {
      existing.historyCount += 1
      if (!existing.aircraftMakeModel && row.aircraft_make_model) {
        existing.aircraftMakeModel = row.aircraft_make_model
      }
      if (!existing.aircraftCategoryClass && row.aircraft_category_class) {
        existing.aircraftCategoryClass = row.aircraft_category_class
      }
      if ((row.updated_at ?? '') > (existing.lastSeenAt ?? '')) {
        existing.lastSeenAt = row.updated_at ?? existing.lastSeenAt
      }
      continue
    }
    registrationMap.set(key, {
      value: key,
      key,
      aircraftMakeModel: row.aircraft_make_model,
      aircraftCategoryClass: row.aircraft_category_class,
      historyCount: 1,
      catalogCount: 0,
      lastSeenAt: row.updated_at ?? null,
    })
  }

  for (const row of options.catalogRows) {
    const key = normalizeDigifiRegistrationKey(row.entity_id ?? '')
    if (!key) continue
    const existing = registrationMap.get(key)
    if (existing) {
      existing.catalogCount += 1
      continue
    }
    registrationMap.set(key, {
      value: key,
      key,
      aircraftMakeModel: null,
      aircraftCategoryClass: null,
      historyCount: 0,
      catalogCount: 1,
      lastSeenAt: null,
    })
  }

  for (const row of options.feedbackRows) {
    const rawKey = row.raw_value_key?.trim() || normalizeDigifiRegistrationKey(row.raw_value ?? '')
    const correctedKey = row.corrected_value_key?.trim() || normalizeDigifiRegistrationKey(row.corrected_value ?? '')
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
    registrations: [...registrationMap.values()],
    feedbackByRawContext,
    feedbackByRawFallback,
  }
}

function getFeedbackRowsForContext(
  index: DigifiRegistrationIndex,
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

function rankRegistrationCandidates(
  normalizedValue: string,
  context: DigifiCorrectionFeedbackContext,
  index: DigifiRegistrationIndex
): RankedCandidate[] {
  const contextKey = buildDigifiFeedbackContextKey(FEEDBACK_FIELD_KEY, context)
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

  return index.registrations
    .map((candidate) => {
      const distance = damerauLevenshtein(normalizedValue, candidate.key)
      if (distance > 2) return null
      const similarity = similarityFromDistance(normalizedValue, candidate.key, distance)
      const contextMatch = candidateContextMatches(candidate, context)
      const feedbackCount = feedbackByCandidateKey.get(candidate.key) ?? 0
      const score =
        similarity +
        (contextMatch ? 0.12 : 0) +
        Math.min(0.18, feedbackCount * 0.06) +
        Math.min(0.05, candidate.historyCount * 0.01) +
        (candidate.catalogCount > 0 ? 0.02 : 0)

      return {
        candidate,
        distance,
        similarity,
        score,
        source: feedbackCount > 0 ? 'feedback' : candidate.historyCount > 0 ? 'history' : 'catalog',
        feedbackCount,
        contextMatch,
      } satisfies RankedCandidate
    })
    .filter((candidate): candidate is RankedCandidate => candidate != null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.distance !== b.distance) return a.distance - b.distance
      return (b.feedbackCount ?? 0) - (a.feedbackCount ?? 0)
    })
}

function toCellCandidate(ranked: RankedCandidate): DigifiScanCellCandidate {
  return {
    value: ranked.candidate.value,
    score: compactScoreNumber(ranked.score),
    distance: ranked.distance,
    source: ranked.source,
    aircraftMakeModel: ranked.candidate.aircraftMakeModel,
    aircraftCategoryClass: ranked.candidate.aircraftCategoryClass,
    sampleCount: ranked.feedbackCount > 0 ? ranked.feedbackCount : ranked.candidate.historyCount,
  }
}

export function resolveDigifiRegistration(
  options: ResolveDigifiRegistrationOptions,
  index: DigifiRegistrationIndex
): DigifiScanCellMeta {
  const rawValue = options.rawValue.trim()
  const normalizedValue = normalizeDigifiRegistrationKey(options.normalizedValue || options.rawValue)
  const contextKey = buildDigifiFeedbackContextKey(FEEDBACK_FIELD_KEY, options.context)

  if (!normalizedValue) {
    return {
      fieldKey: 'identification',
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
  const fallbackFeedbackWinner = exactFeedbackWinner ?? pickFeedbackWinner(feedbackRows, 3)
  const feedbackWinner = fallbackFeedbackWinner
  const exactKnown = index.registrations.find((candidate) => candidate.key === normalizedValue)

  if (feedbackWinner) {
    const correctedValue = feedbackWinner.corrected_value?.trim() || feedbackWinner.corrected_value_key?.trim() || normalizedValue
    return {
      fieldKey: 'identification',
      rawValue,
      resolvedValue: correctedValue,
      strategy: feedbackWinner.corrected_value_key === normalizedValue ? 'feedback_exact' : 'feedback_clear_winner',
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
          ? `Applied a learned registration correction for "${rawValue || normalizedValue}".`
          : undefined,
    }
  }

  if (exactKnown) {
    return {
      fieldKey: 'identification',
      rawValue,
      resolvedValue: exactKnown.value,
      strategy: 'known_exact',
      confidence: 'high',
      autoApplied: false,
      needsReview: false,
      contextKey,
    }
  }

  const ranked = rankRegistrationCandidates(normalizedValue, options.context, index)
  const best = ranked[0]
  const second = ranked[1]

  if (
    best &&
    best.distance === 1 &&
    (!second || second.distance >= 2) &&
    best.score - (second?.score ?? 0) >= 0.08
  ) {
    return {
      fieldKey: 'identification',
      rawValue,
      resolvedValue: best.candidate.value,
      strategy: best.feedbackCount > 0 ? 'feedback_clear_winner' : 'history_clear_winner',
      confidence: best.contextMatch ? 'high' : 'medium',
      autoApplied: true,
      needsReview: false,
      contextKey,
      candidates: ranked.slice(0, 3).map(toCellCandidate),
      message: `Auto-applied registration "${best.candidate.value}" as the only clear match for "${rawValue || normalizedValue}".`,
    }
  }

  if (best && ranked.length > 0) {
    return {
      fieldKey: 'identification',
      rawValue,
      resolvedValue: normalizedValue,
      strategy: 'ambiguous',
      confidence: 'low',
      autoApplied: false,
      needsReview: true,
      contextKey,
      candidates: ranked.slice(0, 5).map(toCellCandidate),
      message: `Review this registration. Multiple likely aircraft match "${rawValue || normalizedValue}".`,
    }
  }

  return {
    fieldKey: 'identification',
    rawValue,
    resolvedValue: normalizedValue,
    strategy: 'raw',
    confidence: 'low',
    autoApplied: false,
    needsReview: false,
    contextKey,
  }
}

export async function personalizeDigifiScanRows(options: {
  userId: string
  supabase: any
  rows: DigifiScanRow[]
  normalizedRows: DigifiScanRow[]
  columns: DigifiTemplateColumn[]
}): Promise<DigifiPersonalizationResult> {
  const rowsWithMeta = buildBaseCellMetaRows(options.rows, options.normalizedRows, options.columns)
  const identificationColumn = options.columns.find((column) => column.fieldKey === 'identification')
  if (!identificationColumn) {
    return {
      rows: rowsWithMeta,
      reviewMessages: [],
      reviewRequiredCount: 0,
    }
  }

  const [historyRows, catalogRows, feedbackRows] = await Promise.all([
    loadRegistrationHistory(options.supabase, options.userId),
    loadCatalogAircraftRows(options.supabase, options.userId),
    loadCorrectionFeedbackRows(options.supabase, options.userId),
  ])
  const index = buildDigifiRegistrationIndex({
    historyRows,
    catalogRows,
    feedbackRows,
  })

  const reviewMessages: string[] = []
  let reviewRequiredCount = 0

  for (const row of rowsWithMeta) {
    const currentValue = row.cells[identificationColumn.id] ?? ''
    if (!currentValue.trim()) continue
    const context = buildDigifiFeedbackContextFromRow(row, options.columns)
    const meta = resolveDigifiRegistration(
      {
        rawValue: row.cellMeta?.[identificationColumn.id]?.rawValue ?? currentValue,
        normalizedValue: currentValue,
        context,
      },
      index
    )
    row.cells[identificationColumn.id] = meta.resolvedValue
    row.cellMeta = {
      ...(row.cellMeta ?? {}),
      [identificationColumn.id]: meta,
    }

    if (meta.needsReview) {
      reviewRequiredCount += 1
      const candidatePreview = (meta.candidates ?? []).slice(0, 3).map((candidate) => candidate.value).join(', ')
      reviewMessages.push(
        `Row ${row.rowIndex + 1}: review identification "${meta.rawValue || currentValue}"${candidatePreview ? ` (${candidatePreview})` : ''}.`
      )
    }
  }

  return {
    rows: rowsWithMeta,
    reviewMessages,
    reviewRequiredCount,
  }
}
