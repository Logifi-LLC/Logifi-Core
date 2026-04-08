import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import type { Database } from '../../../app/types/database'
import {
  alignMappedFcvEntry,
  buildAlignmentIndex,
  normalizeCrewNameForMatching,
  resolveCrewName,
} from '../../utils/fcvAlignment'
import {
  mergeEntryTagsWithFamilyTags,
  normalizeAircraftFamily,
} from '../../utils/aircraftFamily'

interface ImportBody {
  flights: FcvMappedEntry[]
  crewNameOverrides?: Record<string, string>
}

interface CrewReviewCandidate {
  fcv_flight_id: string
  raw_name: string
  normalized_key: string
  suggested_name: string | null
  candidates: string[]
  strategy: 'ambiguous' | 'unresolved'
}

/**
 * Import FC View flights into log_entries. Deduplicates by fcv_flight_id; creates an import_batch.
 * Client must send Authorization: Bearer <supabase_access_token>.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  let body: ImportBody
  try {
    body = await readBody(event)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid body',
    })
  }

  const flights = body?.flights
  if (!Array.isArray(flights) || flights.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No flights to import',
    })
  }

  const crewNameOverrides = body?.crewNameOverrides ?? {}
  const supabase = getSupabaseClient(event)
  const { data: existingRows, error: existingRowsError } = await supabase
    .from('log_entries')
    .select('registration, aircraft_make_model, aircraft_category_class, training_elements')
    .eq('user_id', userId)
    .limit(5000)

  if (existingRowsError) {
    console.error('failed loading existing log_entries for FCV alignment:', existingRowsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load existing logbook entries',
    })
  }

  const { data: personRows, error: personRowsError } = await supabase
    .from('catalog_entity_tags')
    .select('entity_id')
    .eq('user_id', userId)
    .eq('entity_type', 'person')

  if (personRowsError) {
    console.error('failed loading person catalog for FCV alignment:', personRowsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load person catalog',
    })
  }

  const catalogPersonNames = [
    ...new Set(
      (personRows ?? [])
        .map((r) => (typeof r.entity_id === 'string' ? r.entity_id.trim() : ''))
        .filter((v) => v.length > 0)
    ),
  ]

  const alignmentIndex = buildAlignmentIndex(existingRows ?? [], {
    catalogPersonNames,
  })

  const reviewCandidates: CrewReviewCandidate[] = []
  for (const f of flights) {
    const fcvId = typeof f.fcv_flight_id === 'string' ? f.fcv_flight_id.trim() : ''
    if (!fcvId) continue

    const override = typeof crewNameOverrides[fcvId] === 'string' ? crewNameOverrides[fcvId].trim() : ''
    if (override) continue

    const crewResult = resolveCrewName(f.training_elements, alignmentIndex)
    if (crewResult.strategy === 'ambiguous' || crewResult.strategy === 'unresolved') {
      const rawName = typeof f.training_elements === 'string' ? f.training_elements.trim() : ''
      if (!rawName) continue
      const dedupedCandidates = [
        ...new Set([...(crewResult.topCandidates ?? []), rawName]),
      ].filter((n) => typeof n === 'string' && n.trim().length > 0)
      reviewCandidates.push({
        fcv_flight_id: fcvId,
        raw_name: rawName,
        normalized_key: normalizeCrewNameForMatching(rawName),
        suggested_name: crewResult.resolvedName,
        candidates: dedupedCandidates,
        strategy: crewResult.strategy,
      })
    }
  }

  if (reviewCandidates.length > 0) {
    return {
      success: false,
      requires_crew_review: true,
      review_candidates: reviewCandidates,
      imported: 0,
      skipped: 0,
    }
  }

  const { data: familyTagRows, error: familyTagsError } = await supabase
    .from('catalog_entity_tags')
    .select('entity_id, tag')
    .eq('user_id', userId)
    .eq('entity_type', 'family')

  if (familyTagsError) {
    console.error('failed loading family tags for FCV import:', familyTagsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load catalog tags',
    })
  }

  const familyTagsById = new Map<string, string[]>()
  for (const row of familyTagRows ?? []) {
    const familyId = normalizeAircraftFamily(String(row.entity_id ?? ''))
    const tag = typeof row.tag === 'string' ? row.tag.trim() : ''
    if (!familyId || !tag) continue
    const existing = familyTagsById.get(familyId) ?? []
    existing.push(tag)
    familyTagsById.set(familyId, existing)
  }

  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      user_id: userId,
      source_type: 'fc_view',
      total_entries: flights.length,
      successful_imports: 0,
      duplicates_skipped: 0,
      errors: 0,
      import_metadata: { source: 'fc_view' },
    })
    .select('id')
    .single()

  if (batchError || !batch) {
    console.error('import_batches insert failed:', batchError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create import batch',
    })
  }

  const batchId = batch.id
  let inserted = 0
  let skipped = 0

  for (const f of flights) {
    const fcvId = f.fcv_flight_id
    if (!fcvId) {
      skipped++
      continue
    }

    const aligned = alignMappedFcvEntry(f, alignmentIndex, {
      crewManualOverrideName:
        typeof crewNameOverrides[fcvId] === 'string' ? crewNameOverrides[fcvId].trim() : null,
    })

    const { data: existing } = await supabase
      .from('log_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('fcv_flight_id', fcvId)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const entry: Database['public']['Tables']['log_entries']['Insert'] = {
      user_id: userId,
      date: aligned.date,
      role: aligned.role,
      aircraft_category_class: aligned.aircraft_category_class,
      category_class_time: aligned.category_class_time,
      aircraft_make_model: aligned.aircraft_make_model,
      registration: aligned.registration,
      flight_number: aligned.flight_number,
      departure: aligned.departure,
      destination: aligned.destination,
      route: aligned.route,
      training_elements: aligned.training_elements ?? null,
      training_instructor: aligned.training_instructor ?? null,
      flight_time: aligned.flight_time,
      performance: aligned.performance,
      oooi: aligned.oooi,
      remarks: aligned.remarks ?? null,
      flight_conditions:
        Array.isArray(aligned.flight_conditions) && aligned.flight_conditions.length > 0
          ? aligned.flight_conditions
          : ['ifr'],
      tags: (() => {
        const ownTags = Array.isArray(aligned.tags) ? aligned.tags : []
        const mergedTags = mergeEntryTagsWithFamilyTags(
          ownTags,
          aligned.aircraft_make_model ?? '',
          familyTagsById
        )
        return mergedTags.length > 0 ? mergedTags : undefined
      })(),
      is_imported: true,
      import_source: 'fc_view',
      import_batch_id: batchId,
      original_entry_date: aligned.original_entry_date,
      import_metadata: aligned.import_metadata,
      fcv_flight_id: fcvId,
    }

    const { error: insertErr } = await supabase.from('log_entries').insert(entry)
    if (insertErr) {
      console.error('log_entries insert failed for fcv_flight_id', fcvId, insertErr)
      skipped++
      continue
    }
    inserted++
  }

  await supabase
    .from('import_batches')
    .update({
      successful_imports: inserted,
      duplicates_skipped: skipped,
      errors: flights.length - inserted - skipped,
    })
    .eq('id', batchId)

  return {
    success: true,
    import_batch_id: batchId,
    imported: inserted,
    skipped,
  }
})
