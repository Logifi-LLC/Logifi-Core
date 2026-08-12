import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { fetchFlightActuals } from '../../utils/aeroDataBox'
import { mapAirlineLegToFcvMappedEntry } from '../../utils/airlineLeg'
import type { AirlineLeg } from '../../utils/airlineLeg'
import { filterAirlineLegs, parseFlicaSchedule } from '../../utils/flicaParse'
import {
  fetchScheduleHtml,
  loginFlica,
  FlicaClientError,
} from '../../utils/flicaClient'
import { resolveFlicaPortal } from '../../utils/flicaPortal'
import { unsealSecret, SecretBoxError } from '../../utils/secretBox'
import type { FcvMappedEntry } from '../../utils/fcvMap'

interface FetchFlicaBody {
  dateFrom?: string
  dateTo?: string
  includeDeadheads?: boolean
  includeScheduled?: boolean
  airlineCode?: string
}

const ENRICH_CONCURRENCY = 3

async function enrichLegWithAeroDataBox(leg: AirlineLeg, todayYmd: string): Promise<AirlineLeg> {
  const date = leg.scheduled_out_local?.slice(0, 10) ?? ''
  if (!date || date > todayYmd) return leg

  const actuals = await fetchFlightActuals(
    leg.flight_number,
    date,
    leg.dep_airport,
    leg.arr_airport
  )
  if (!actuals) return leg

  return {
    ...leg,
    fcv_tail_number: actuals.registration ?? leg.fcv_tail_number,
    fcv_aircraft_type: actuals.aircraftType ?? leg.fcv_aircraft_type,
    actual_out_local: actuals.actualOutLocal ?? leg.actual_out_local,
    actual_in_local: actuals.actualInLocal ?? leg.actual_in_local,
    actual_off_local: actuals.actualOffLocal ?? leg.actual_off_local,
    actual_on_local: actuals.actualOnLocal ?? leg.actual_on_local,
  }
}

async function enrichLegsSequential(
  legs: AirlineLeg[],
  todayYmd: string
): Promise<AirlineLeg[]> {
  const out: AirlineLeg[] = []
  for (let i = 0; i < legs.length; i += ENRICH_CONCURRENCY) {
    const chunk = legs.slice(i, i + ENRICH_CONCURRENCY)
    const enriched = await Promise.all(
      chunk.map((leg) => enrichLegWithAeroDataBox(leg, todayYmd))
    )
    out.push(...enriched)
  }
  return out
}

/**
 * Scrape connected FLICA schedule, enrich via AeroDataBox, return preview rows.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let body: FetchFlicaBody = {}
  try {
    body = (await readBody(event)) ?? {}
  } catch {
    body = {}
  }

  let portal
  try {
    portal = resolveFlicaPortal(body.airlineCode)
  } catch (e) {
    throw createError({
      statusCode: 400,
      statusMessage: e instanceof Error ? e.message : 'Unsupported airline',
    })
  }

  const supabase = getSupabaseClient(event)
  const { data: integration, error: loadErr } = await supabase
    .from('flica_integrations')
    .select(
      'id, username, password_ciphertext, password_nonce, portal_host, airline_code'
    )
    .eq('user_id', userId)
    .eq('airline_code', portal.airlineCode)
    .maybeSingle()

  if (loadErr) {
    console.error('flica_integrations load failed:', loadErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load FLICA connection' })
  }
  if (!integration) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Connect FLICA first',
    })
  }

  let password: string
  try {
    password = unsealSecret(integration.password_ciphertext, integration.password_nonce)
  } catch (e) {
    if (e instanceof SecretBoxError) {
      throw createError({
        statusCode: 503,
        statusMessage: 'FLICA credential encryption is not configured (FLICA_CREDENTIALS_KEY)',
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not decrypt stored FLICA password. Disconnect and reconnect.',
    })
  }

  const host = integration.portal_host || portal.host
  const dateFrom =
    typeof body.dateFrom === 'string' && body.dateFrom.trim()
      ? body.dateFrom.trim()
      : new Date().toISOString().slice(0, 10)
  const dateTo =
    typeof body.dateTo === 'string' && body.dateTo.trim()
      ? body.dateTo.trim()
      : dateFrom

  let scheduleHtml: string
  try {
    const session = await loginFlica({
      host,
      username: integration.username,
      password,
    })
    scheduleHtml = await fetchScheduleHtml(session, { dateFrom, dateTo })
    await supabase
      .from('flica_integrations')
      .update({ last_ok_at: new Date().toISOString(), last_error: null })
      .eq('id', integration.id)
  } catch (e) {
    const message =
      e instanceof FlicaClientError
        ? e.message
        : 'Failed to fetch schedule from FLICA'
    await supabase
      .from('flica_integrations')
      .update({ last_error: message.slice(0, 500) })
      .eq('id', integration.id)

    if (e instanceof FlicaClientError) {
      const status =
        e.code === 'login_failed' || e.code === 'mfa_required'
          ? 401
          : e.code === 'schedule_not_found'
            ? 502
            : 502
      throw createError({ statusCode: status, statusMessage: message })
    }
    throw createError({ statusCode: 502, statusMessage: message })
  }

  const todayYmd = new Date().toISOString().slice(0, 10)
  const parsed = parseFlicaSchedule(scheduleHtml)
  const filtered = filterAirlineLegs(parsed, {
    dateFrom,
    dateTo,
    includeDeadheads: body.includeDeadheads === true,
    includeScheduled: body.includeScheduled === true,
    todayYmd,
  })

  const enriched = await enrichLegsSequential(filtered, todayYmd)
  const mapped: FcvMappedEntry[] = enriched.map(mapAirlineLegToFcvMappedEntry)

  return {
    success: true,
    flights: mapped,
    count: mapped.length,
  }
})
