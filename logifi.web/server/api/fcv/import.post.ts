import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import type { Database } from '../../../app/types/database'
import { alignMappedFcvEntry, buildAlignmentIndex } from '../../utils/fcvAlignment'

interface ImportBody {
  flights: FcvMappedEntry[]
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

  const alignmentIndex = buildAlignmentIndex(existingRows ?? [])

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
    const aligned = alignMappedFcvEntry(f, alignmentIndex)
    const fcvId = f.fcv_flight_id
    if (!fcvId) {
      skipped++
      continue
    }

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
      tags: Array.isArray(aligned.tags) && aligned.tags.length > 0 ? aligned.tags : undefined,
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
