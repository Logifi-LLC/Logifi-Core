import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import type { Database } from '../../../app/types/database'

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
      date: f.date,
      role: f.role,
      aircraft_category_class: f.aircraft_category_class,
      category_class_time: f.category_class_time,
      aircraft_make_model: f.aircraft_make_model,
      registration: f.registration,
      flight_number: f.flight_number,
      departure: f.departure,
      destination: f.destination,
      route: f.route,
      flight_time: f.flight_time,
      performance: f.performance,
      oooi: f.ooi,
      is_imported: true,
      import_source: 'fc_view',
      import_batch_id: batchId,
      original_entry_date: f.original_entry_date,
      import_metadata: f.import_metadata,
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
