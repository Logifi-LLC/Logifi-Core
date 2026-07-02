import { defineEventHandler, readBody, createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import type { Database } from '../../../app/types/database'
import {
  alignMappedFcvEntry,
  buildAlignmentIndex,
  buildCatalogPersonAlignmentSeeds,
  normalizeCrewNameForMatching,
  resolveCrewName,
} from '../../utils/fcvAlignment'
import {
  mergeEntryTagsWithFamilyTags,
  normalizeAircraftFamily,
} from '../../utils/aircraftFamily'
import {
  findHeuristicMatchForFcvFlight,
  logEntryRowToExistingForDedup,
} from '../../utils/fcvPreviewDuplicates'

type CrewOverrideMode = 'pick' | 'rename' | 'asis'
type FcvFlightAction = 'import' | 'link' | 'skip'

interface ImportBody {
  flights: FcvMappedEntry[]
  crewNameOverrides?: Record<string, string>
  /** Set for flights that went through crew review; drives person catalog bootstrap on `rename`. */
  crewOverrideModes?: Record<string, CrewOverrideMode>
  /** When true, insert rows even when they heuristically match an existing logbook entry. */
  allowDuplicates?: boolean
  /** Per-flight resolution for heuristic duplicates (`import`, `link`, or `skip`). */
  flightActions?: Record<string, FcvFlightAction>
}

function normalizePersonEntityIdForCatalog(displayName: string): string {
  return displayName.trim().toLowerCase()
}

/**
 * Ensure a person catalog row exists so future FCV imports can align to this name.
 * Matches dashboard `addEntityTag` person `entity_id` normalization (lowercase).
 */
async function bootstrapPersonCatalogFromRename(
  supabase: SupabaseClient<Database>,
  userId: string,
  displayName: string
) {
  const trimmed = displayName.trim()
  if (!trimmed) return

  const entityId = normalizePersonEntityIdForCatalog(trimmed)
  if (!entityId) return

  let tag = trimmed
  const tryInsert = async (t: string) => {
    const { error } = await supabase.from('catalog_entity_tags').insert({
      user_id: userId,
      entity_type: 'person',
      entity_id: entityId,
      tag: t,
    })
    return error
  }

  let err = await tryInsert(tag)
  if (err?.code === '23505') return
  if (!err) return

  tag = 'crew'
  err = await tryInsert(tag)
  if (err?.code === '23505') return
  if (err) {
    console.error('FCV import: person catalog bootstrap failed', err)
  }
}

interface CrewReviewCandidate {
  fcv_flight_id: string
  raw_name: string
  normalized_key: string
  suggested_name: string | null
  candidates: string[]
  strategy: 'ambiguous' | 'unresolved'
}

function buildFcvInsertEntry(
  userId: string,
  aligned: FcvMappedEntry,
  batchId: string,
  fcvId: string,
  familyTagsById: Map<string, string[]>
): Database['public']['Tables']['log_entries']['Insert'] {
  return {
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
}

async function linkFcvFlightToExistingEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  existingId: string,
  aligned: FcvMappedEntry,
  fcvId: string,
  batchId: string,
  familyTagsById: Map<string, string[]>
): Promise<boolean> {
  const { data: existing, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', existingId)
    .maybeSingle()

  if (error || !existing) {
    if (error) console.error('linkFcvFlightToExistingEntry load failed:', error)
    return false
  }
  if (existing.fcv_flight_id) return false

  const manualRemarks =
    typeof existing.remarks === 'string' && existing.remarks.trim()
      ? existing.remarks.trim()
      : null
  const fcvRemarks =
    typeof aligned.remarks === 'string' && aligned.remarks.trim()
      ? aligned.remarks.trim()
      : null
  const mergedRemarks = manualRemarks ?? fcvRemarks

  const ownTags = Array.isArray(aligned.tags) ? aligned.tags : []
  const mergedTags = mergeEntryTagsWithFamilyTags(
    ownTags,
    aligned.aircraft_make_model ?? '',
    familyTagsById
  )
  const existingTags = Array.isArray(existing.tags) ? existing.tags : []

  const update: Database['public']['Tables']['log_entries']['Update'] = {
    role: aligned.role,
    aircraft_category_class: aligned.aircraft_category_class,
    category_class_time: aligned.category_class_time,
    aircraft_make_model: aligned.aircraft_make_model,
    registration: aligned.registration,
    flight_number: aligned.flight_number,
    departure: aligned.departure,
    destination: aligned.destination,
    route: aligned.route,
    training_elements: aligned.training_elements ?? existing.training_elements,
    training_instructor: aligned.training_instructor ?? existing.training_instructor,
    flight_time: aligned.flight_time,
    performance: aligned.performance,
    oooi: aligned.oooi,
    remarks: mergedRemarks,
    flight_conditions:
      Array.isArray(aligned.flight_conditions) && aligned.flight_conditions.length > 0
        ? aligned.flight_conditions
        : existing.flight_conditions ?? ['ifr'],
    tags: mergedTags.length > 0 ? mergedTags : existingTags.length > 0 ? existingTags : undefined,
    is_imported: true,
    import_source: 'fc_view',
    import_batch_id: batchId,
    original_entry_date: aligned.original_entry_date,
    import_metadata: aligned.import_metadata,
    fcv_flight_id: fcvId,
  }

  const { error: updateErr } = await supabase
    .from('log_entries')
    .update(update)
    .eq('user_id', userId)
    .eq('id', existingId)

  if (updateErr) {
    console.error('linkFcvFlightToExistingEntry update failed:', updateErr)
    return false
  }
  return true
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
  const crewOverrideModes = body?.crewOverrideModes ?? {}
  const allowDuplicates = body?.allowDuplicates === true
  const flightActions = body?.flightActions ?? {}
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
    .select('entity_id, tag')
    .eq('user_id', userId)
    .eq('entity_type', 'person')

  if (personRowsError) {
    console.error('failed loading person catalog for FCV alignment:', personRowsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load person catalog',
    })
  }

  const catalogPersons = buildCatalogPersonAlignmentSeeds(personRows ?? [])

  const alignmentIndex = buildAlignmentIndex(existingRows ?? [], {
    catalogPersons,
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
  let linked = 0
  let skipped = 0

  const importDates = [
    ...new Set(flights.map((f) => f.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
  ]
  let existingForDedup: ReturnType<typeof logEntryRowToExistingForDedup>[] = []
  if (importDates.length > 0) {
    const { data: dedupRows, error: dedupError } = await supabase
      .from('log_entries')
      .select(
        'id, date, registration, departure, destination, flight_time, oooi, is_imported, import_source, fcv_flight_id'
      )
      .eq('user_id', userId)
      .in('date', importDates)

    if (dedupError) {
      console.error('failed loading log_entries for FCV import dedup:', dedupError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load existing logbook entries for import',
      })
    }
    existingForDedup = (dedupRows ?? []).map((row) => logEntryRowToExistingForDedup(row))
  }

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

    const heuristicMatch = findHeuristicMatchForFcvFlight(f, existingForDedup)
    const action =
      typeof flightActions[fcvId] === 'string'
        ? (flightActions[fcvId] as FcvFlightAction)
        : undefined

    if (action === 'skip' && heuristicMatch) {
      skipped++
      continue
    }

    if (heuristicMatch) {
      if (action === 'link') {
        const didLink = await linkFcvFlightToExistingEntry(
          supabase,
          userId,
          heuristicMatch.id,
          aligned,
          fcvId,
          batchId,
          familyTagsById
        )
        if (didLink) {
          linked++
          const mode = crewOverrideModes[fcvId]
          if (mode === 'rename') {
            const resolved =
              typeof crewNameOverrides[fcvId] === 'string' ? crewNameOverrides[fcvId].trim() : ''
            if (resolved) {
              await bootstrapPersonCatalogFromRename(supabase, userId, resolved)
            }
          }
        } else {
          skipped++
        }
        continue
      }

      if (!allowDuplicates && action !== 'import') {
        skipped++
        continue
      }
    }

    const entry = buildFcvInsertEntry(userId, aligned, batchId, fcvId, familyTagsById)

    const { error: insertErr } = await supabase.from('log_entries').insert(entry)
    if (insertErr) {
      console.error('log_entries insert failed for fcv_flight_id', fcvId, insertErr)
      skipped++
      continue
    }
    inserted++

    const mode = crewOverrideModes[fcvId]
    if (mode === 'rename') {
      const resolved =
        typeof crewNameOverrides[fcvId] === 'string' ? crewNameOverrides[fcvId].trim() : ''
      if (resolved) {
        await bootstrapPersonCatalogFromRename(supabase, userId, resolved)
      }
    }
  }

  await supabase
    .from('import_batches')
    .update({
      successful_imports: inserted + linked,
      duplicates_skipped: skipped,
      errors: flights.length - inserted - linked - skipped,
    })
    .eq('id', batchId)

  return {
    success: true,
    import_batch_id: batchId,
    imported: inserted,
    linked,
    skipped,
  }
})
