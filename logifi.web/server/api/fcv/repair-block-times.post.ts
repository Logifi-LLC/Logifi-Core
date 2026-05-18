import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import {
  recomputeFcvBlockFields,
  type FcvFlight,
} from '../../utils/fcvMap'

const REPAIR_THRESHOLD_HOURS = 0.05

function storedTotalHours(flightTime: unknown): number | null {
  if (!flightTime || typeof flightTime !== 'object') return null
  const total = (flightTime as { total?: unknown }).total
  if (typeof total !== 'number' || !Number.isFinite(total)) return null
  return total
}

function fcvRawFromMetadata(metadata: unknown): FcvFlight | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as { fcv_raw?: unknown }).fcv_raw
  if (!raw || typeof raw !== 'object') return null
  return raw as FcvFlight
}

/**
 * Recompute block times for existing FC View imports using stored fcv_raw and
 * timezone-aware gate duration. Client must send Authorization: Bearer token.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const supabase = getSupabaseClient(event)
  const { data: rows, error: queryError } = await supabase
    .from('log_entries')
    .select('id, role, departure, destination, flight_time, import_metadata')
    .eq('user_id', userId)
    .eq('import_source', 'fc_view')

  if (queryError) {
    console.error('repair-block-times query failed:', queryError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load FC View entries',
    })
  }

  let scanned = 0
  let repaired = 0
  let unchanged = 0
  let skipped = 0

  for (const row of rows ?? []) {
    scanned++
    const fcvRaw = fcvRawFromMetadata(row.import_metadata)
    if (!fcvRaw) {
      skipped++
      continue
    }

    const dep = String(row.departure ?? fcvRaw.dep_airport_icao ?? fcvRaw.dep_airport ?? '').trim()
    const arr = String(
      row.destination ?? fcvRaw.arr_airport_icao ?? fcvRaw.arr_airport ?? ''
    ).trim()
    const roleRaw = String(row.role ?? fcvRaw.role ?? 'PIC').trim().toUpperCase()
    const role: 'PIC' | 'SIC' = roleRaw === 'SIC' ? 'SIC' : 'PIC'

    const next = recomputeFcvBlockFields(fcvRaw, role, dep, arr)
    if (next.blockHours == null) {
      skipped++
      continue
    }

    const prevTotal = storedTotalHours(row.flight_time)
    if (
      prevTotal !== null &&
      Math.abs(prevTotal - next.blockHours) < REPAIR_THRESHOLD_HOURS
    ) {
      unchanged++
      continue
    }

    const { error: updateError } = await supabase
      .from('log_entries')
      .update({
        flight_time: next.flight_time,
        category_class_time: next.category_class_time,
        flight_conditions: next.flight_conditions,
      })
      .eq('id', row.id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('repair-block-times update failed for', row.id, updateError)
      skipped++
      continue
    }

    repaired++
  }

  return { scanned, repaired, unchanged, skipped }
})
