import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import {
  entriesDuplicateMatch,
  type DuplicateEntryMatchShape,
} from '../../../shared/duplicateEntryMatch'

interface Body {
  flights: FcvMappedEntry[]
}

function fcvToMatchShape(f: FcvMappedEntry): DuplicateEntryMatchShape {
  const ft = f.flight_time as { total?: unknown } | undefined
  const total =
    typeof ft?.total === 'number' && Number.isFinite(ft.total) ? ft.total : null
  const oooi = f.oooi as { out?: unknown } | null
  const out =
    typeof oooi?.out === 'string' && oooi.out.trim() !== '' ? oooi.out : null

  return {
    date: f.date,
    registration: f.registration,
    departure: f.departure,
    destination: f.destination,
    oooiOut: out,
    flightTimeTotal: total,
  }
}

function dbRowToMatchShape(row: {
  date: string
  registration: string
  departure: string
  destination: string
  flight_time: unknown
  oooi: unknown
}): DuplicateEntryMatchShape {
  const ft = row.flight_time as { total?: unknown } | null
  const raw = ft?.total
  const total =
    typeof raw === 'number' && Number.isFinite(raw)
      ? raw
      : typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))
        ? Number(raw)
        : null
  const oooi = row.oooi as { out?: unknown } | null
  const out =
    typeof oooi?.out === 'string' && oooi.out.trim() !== '' ? oooi.out : null

  return {
    date: row.date,
    registration: row.registration,
    departure: row.departure,
    destination: row.destination,
    oooiOut: out,
    flightTimeTotal: total,
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
    return { duplicateFcvFlightIds: [] as string[], duplicateIndices: [] as number[] }
  }

  const dates = [...new Set(flights.map((f) => f.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
  if (dates.length === 0) {
    return { duplicateFcvFlightIds: [] as string[], duplicateIndices: [] as number[] }
  }

  const supabase = getSupabaseClient(event)
  const { data: rows, error } = await supabase
    .from('log_entries')
    .select('date, registration, departure, destination, flight_time, oooi')
    .eq('user_id', userId)
    .in('date', dates)

  if (error) {
    console.error('check-duplicates log_entries query:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load logbook' })
  }

  const existingShapes = (rows ?? []).map(dbRowToMatchShape)

  const duplicateIndices: number[] = []
  const duplicateFcvFlightIds: string[] = []

  flights.forEach((f, index) => {
    const previewShape = fcvToMatchShape(f)
    const hit = existingShapes.some((ex) =>
      entriesDuplicateMatch(previewShape, ex, 'importLeg')
    )
    if (hit) {
      duplicateIndices.push(index)
      const id = String(f.fcv_flight_id ?? '').trim()
      if (id) duplicateFcvFlightIds.push(id)
    }
  })

  return { duplicateFcvFlightIds, duplicateIndices }
})
