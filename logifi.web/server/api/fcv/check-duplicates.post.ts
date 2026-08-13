import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import {
  logEntryRowToExistingForDedup,
  partitionFcvPreviewDuplicates,
} from '../../utils/fcvPreviewDuplicates'

interface Body {
  flights: FcvMappedEntry[]
}

const FCV_ID_IN_CHUNK = 120

async function loadExistingFcvIds(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  ids: string[]
): Promise<Set<string>> {
  const out = new Set<string>()
  if (ids.length === 0) return out

  for (let i = 0; i < ids.length; i += FCV_ID_IN_CHUNK) {
    const chunk = ids.slice(i, i + FCV_ID_IN_CHUNK)
    const { data, error } = await supabase
      .from('log_entries')
      .select('fcv_flight_id')
      .eq('user_id', userId)
      .in('fcv_flight_id', chunk)

    if (error) {
      console.error('check-duplicates fcv_flight_id query:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load logbook' })
    }
    for (const row of data ?? []) {
      const id = typeof row.fcv_flight_id === 'string' ? row.fcv_flight_id.trim() : ''
      if (id) out.add(id)
    }
  }
  return out
}

function emptyResponse() {
  return {
    duplicateFcvFlightIds: [] as string[],
    duplicateIndices: [] as number[],
    alreadyImportedIndices: [] as number[],
    heuristicDuplicateIndices: [] as number[],
    alreadyImportedFcvFlightIds: [] as string[],
    heuristicMatches: [] as Array<{
      index: number
      fcvFlightId: string
      existingEntryId: string
      date: string
      registration: string
      departure: string
      destination: string
      flightTimeTotal: number | null
      isImported: boolean
      importSource: string | null
    }>,
  }
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let body: Body
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  const flights = body?.flights
  if (!Array.isArray(flights) || flights.length === 0) {
    return emptyResponse()
  }

  const dates = [
    ...new Set(flights.map((f) => f.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
  ]

  const supabase = getSupabaseClient(event)

  const previewFcvIds = [
    ...new Set(
      flights
        .map((f) => String(f.fcv_flight_id ?? '').trim())
        .filter((id) => id.length > 0)
    ),
  ]

  const existingFcvIds = await loadExistingFcvIds(supabase, userId, previewFcvIds)

  let existingEntries: ReturnType<typeof logEntryRowToExistingForDedup>[] = []
  if (dates.length > 0) {
    const { data: rows, error } = await supabase
      .from('log_entries')
      .select(
        'id, date, registration, departure, destination, flight_time, oooi, is_imported, import_source, fcv_flight_id, flight_number'
      )
      .eq('user_id', userId)
      .in('date', dates)

    if (error) {
      console.error('check-duplicates log_entries query:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load logbook' })
    }
    existingEntries = (rows ?? []).map((row) => logEntryRowToExistingForDedup(row))
  }

  const part = partitionFcvPreviewDuplicates(flights, existingEntries, existingFcvIds)

  return {
    duplicateFcvFlightIds: part.duplicateFcvFlightIds,
    duplicateIndices: part.duplicateIndices,
    alreadyImportedIndices: part.alreadyImportedIndices,
    heuristicDuplicateIndices: part.heuristicDuplicateIndices,
    alreadyImportedFcvFlightIds: part.alreadyImportedFcvFlightIds,
    heuristicMatches: part.heuristicMatches,
  }
})
