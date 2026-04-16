import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { getValidFcvAccessToken } from '../../utils/fcvToken'
import { mapFcvFlightToEntry, type FcvFlight, type FcvMappedEntry } from '../../utils/fcvMap'
import { fetchFcvWithRetry } from '../../utils/fcvRetryFetch'

interface FetchBody {
  dateFrom: string
  dateTo: string
  includeDeadheads?: boolean
  includeScheduled?: boolean
}

export function hasActualOffLocal(flight: Pick<FcvFlight, 'actual_off_local'>): boolean {
  return typeof flight.actual_off_local === 'string' && flight.actual_off_local.trim().length > 0
}

/**
 * Fetch flights from FC View for the given date range; return mapped preview only (no DB insert).
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

  const supabase = getSupabaseClient(event)
  const { data: integration } = await supabase
    .from('fcv_integrations')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!integration) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Connect FC View first',
    })
  }

  const accessToken = await getValidFcvAccessToken(event)
  if (!accessToken) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not obtain FC View access token',
    })
  }

  const config = useRuntimeConfig()
  const apiBase = (config.fcvApiBaseUrl as string).replace(/\/$/, '')
  if (!apiBase) {
    throw createError({
      statusCode: 503,
      statusMessage: 'FC View API not configured',
    })
  }

  let body: FetchBody
  try {
    body = await readBody(event)
  } catch {
    body = {} as FetchBody
  }
  const dateFrom = (body?.dateFrom ?? new Date().toISOString().slice(0, 10)) as string
  const dateTo = (body?.dateTo ?? new Date().toISOString().slice(0, 10)) as string
  const includeDeadheads = body?.includeDeadheads ?? false
  const includeScheduled = body?.includeScheduled ?? false

  // FC View /flights/ expects start_datetime_local & end_datetime_local as YYYY-MM-DD HH:MM:SS.
  const startLocal = `${dateFrom} 00:00:00`
  const endLocal = `${dateTo} 23:59:59`
  const params = new URLSearchParams({
    start_datetime_local: startLocal,
    end_datetime_local: endLocal,
  })
  const url = `${apiBase}/flights/?${params.toString()}`

  const res = await fetchFcvWithRetry(url, {
    logLabel: 'FC View /flights',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('FC View flights fetch failed:', res.status, errText)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch flights from FC View',
    })
  }

  const data = (await res.json()) as { flights?: FcvFlight[] } | FcvFlight[]
  let flights: FcvFlight[] = Array.isArray(data) ? data : (data?.flights ?? [])
  if (!includeDeadheads) {
    flights = flights.filter((f) => f.is_deadhead !== 1)
  }
  if (!includeScheduled) {
    flights = flights.filter((f) => hasActualOffLocal(f))
  }
  const mapped: FcvMappedEntry[] = flights.map(mapFcvFlightToEntry)

  return {
    success: true,
    flights: mapped,
    count: mapped.length,
  }
})
