import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import {
  isAeroDataBoxConfigured,
  isUsableAeroDataBoxHit,
  lookupFlightActuals,
  summarizeAeroLookupDetails,
} from '../../utils/aeroDataBox'
import { mapAirlineLegToFcvMappedEntry } from '../../utils/airlineLeg'
import type { AirlineLeg } from '../../utils/airlineLeg'
import {
  logEntryRowToExistingForDedup,
  partitionFcvPreviewDuplicates,
} from '../../utils/fcvPreviewDuplicates'
import {
  filterAirlineLegsWithStats,
  overlayFlicaPairingLegs,
  parseFlicaSchedule,
  parseFlicaLastUpdatedMs,
  summarizeFlicaHtml,
  FLICA_DEFAULT_NOW_ZONE,
} from '../../utils/flicaParse'
import {
  fetchFlicaPairingOverlays,
  fetchScheduleHtml,
  loginFlica,
  FlicaClientError,
  type FlicaSession,
} from '../../utils/flicaClient'
import { resolveFlicaPortal } from '../../utils/flicaPortal'
import { unsealSecret, SecretBoxError } from '../../utils/secretBox'
import type { FcvMappedEntry } from '../../utils/fcvMap'
import { DateTime } from 'luxon'
import {
  buildAutofiSourceTrace,
  clockFromLocalDatetime,
  emptyAeroEnricherSnapshot,
  snapshotFlicaSource,
  type AutofiEnricherSnapshot,
} from '../../../shared/autofiSources'

interface FetchFlicaBody {
  dateFrom?: string
  dateTo?: string
  includeDeadheads?: boolean
  includeScheduled?: boolean
  airlineCode?: string
}

function withAutofiSources(
  leg: AirlineLeg,
  enricher: AutofiEnricherSnapshot
): AirlineLeg {
  return {
    ...leg,
    autofi_sources: buildAutofiSourceTrace(snapshotFlicaSource(leg), enricher),
  }
}

function enricherFromAeroLookup(
  lookup: {
    actuals: {
      registration: string | null
      aircraftType: string | null
      actualOffLocal: string | null
      actualOnLocal: string | null
      unusedOutLocal: string | null
      unusedInLocal: string | null
    } | null
    unusedOutLocal: string | null
    unusedInLocal: string | null
    detail: string | null
  },
  extras: Partial<AutofiEnricherSnapshot>
): AutofiEnricherSnapshot {
  const actuals = lookup.actuals
  return emptyAeroEnricherSnapshot({
    configured: true,
    attempted: true,
    ident: lookup.detail,
    tail: actuals?.registration ?? null,
    type: actuals?.aircraftType ?? null,
    off: clockFromLocalDatetime(actuals?.actualOffLocal),
    on: clockFromLocalDatetime(actuals?.actualOnLocal),
    unusedOut: clockFromLocalDatetime(lookup.unusedOutLocal ?? actuals?.unusedOutLocal),
    unusedIn: clockFromLocalDatetime(lookup.unusedInLocal ?? actuals?.unusedInLocal),
    ...extras,
  })
}

async function enrichLegWithAeroDataBox(
  leg: AirlineLeg,
  dateTo: string,
  airlineCode: string
): Promise<{
  leg: AirlineLeg
  attempted: boolean
  enriched: boolean
  detail: string | null
  authRejected: boolean
  rateLimited: boolean
}> {
  const date = leg.scheduled_out_local?.slice(0, 10) ?? ''
  if (!date || date > dateTo) {
    return {
      leg: withAutofiSources(
        leg,
        emptyAeroEnricherSnapshot({ configured: isAeroDataBoxConfigured() })
      ),
      attempted: false,
      enriched: false,
      detail: null,
      authRejected: false,
      rateLimited: false,
    }
  }
  if (!isAeroDataBoxConfigured()) {
    return {
      leg: withAutofiSources(leg, emptyAeroEnricherSnapshot({ configured: false })),
      attempted: false,
      enriched: false,
      detail: null,
      authRejected: false,
      rateLimited: false,
    }
  }

  const lookup = await lookupFlightActuals(
    leg.flight_number,
    date,
    leg.dep_airport,
    leg.arr_airport,
    airlineCode
  )
  if (lookup.authRejected) {
    return {
      leg: withAutofiSources(leg, enricherFromAeroLookup(lookup, { hit: false })),
      attempted: true,
      enriched: false,
      detail: lookup.detail,
      authRejected: true,
      rateLimited: false,
    }
  }
  if (lookup.rateLimited) {
    return {
      leg: withAutofiSources(leg, enricherFromAeroLookup(lookup, { hit: false })),
      attempted: true,
      enriched: false,
      detail: lookup.detail,
      authRejected: false,
      rateLimited: true,
    }
  }
  if (!lookup.actuals || !isUsableAeroDataBoxHit(lookup.actuals)) {
    return {
      leg: withAutofiSources(leg, enricherFromAeroLookup(lookup, { hit: false })),
      attempted: true,
      enriched: false,
      detail: lookup.detail,
      authRejected: false,
      rateLimited: false,
    }
  }

  const flica = snapshotFlicaSource(leg)
  return {
    leg: {
      ...leg,
      fcv_tail_number: lookup.actuals.registration ?? leg.fcv_tail_number,
      fcv_aircraft_type: lookup.actuals.aircraftType ?? leg.fcv_aircraft_type,
      // Do not copy actual_out_local / actual_in_local from AeroDataBox — FLICA gate
      // times (scheduled_out/in) are ground truth and are already actual for completed flights.
      actual_off_local: lookup.actuals.actualOffLocal ?? leg.actual_off_local,
      actual_on_local: lookup.actuals.actualOnLocal ?? leg.actual_on_local,
      autofi_sources: buildAutofiSourceTrace(
        flica,
        enricherFromAeroLookup(lookup, { hit: true })
      ),
    },
    attempted: true,
    enriched: true,
    detail: lookup.detail,
    authRejected: false,
    rateLimited: false,
  }
}

async function enrichLegsSequential(
  legs: AirlineLeg[],
  dateTo: string,
  airlineCode: string,
  skipIndices: Set<number> = new Set()
): Promise<{
  legs: AirlineLeg[]
  enrichAttempted: number
  enrichedCount: number
  enrichDetail: string | null
  authRejected: boolean
}> {
  const out: AirlineLeg[] = []
  let enrichAttempted = 0
  let enrichedCount = 0
  let authRejected = false
  let rateLimited = false
  const details: string[] = []

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i]!
    const date = leg.scheduled_out_local?.slice(0, 10) ?? ''
    const eligible = Boolean(date && date <= dateTo && isAeroDataBoxConfigured())
    if (!eligible || skipIndices.has(i)) {
      out.push(
        withAutofiSources(
          leg,
          emptyAeroEnricherSnapshot({
            configured: isAeroDataBoxConfigured(),
            skipped: skipIndices.has(i),
          })
        )
      )
      continue
    }
    if (rateLimited) {
      out.push(
        withAutofiSources(
          leg,
          emptyAeroEnricherSnapshot({ configured: true, skipped: true, ident: 'rate limited' })
        )
      )
      continue
    }

    const r = await enrichLegWithAeroDataBox(leg, dateTo, airlineCode)
    out.push(r.leg)
    if (r.attempted) enrichAttempted++
    if (r.enriched) enrichedCount++
    if (r.authRejected) authRejected = true
    if (r.rateLimited) rateLimited = true
    if (r.detail) details.push(r.detail)
  }

  const shown = summarizeAeroLookupDetails(details)
  let enrichDetail: string | null = null
  if (authRejected) {
    enrichDetail = 'AeroDataBox rejected the API key'
  } else if (rateLimited) {
    enrichDetail =
      'AeroDataBox rate limit (HTTP 429). Stopped early — wait a minute and fetch again.'
  } else if (enrichAttempted > 0) {
    const ratio = `${enrichedCount}/${enrichAttempted}`
    if (enrichedCount === 0) {
      enrichDetail = shown
        ? `${ratio} no usable AeroDataBox hit (${shown})`
        : `${ratio} no usable AeroDataBox hit`
    } else if (shown) {
      enrichDetail = `${ratio} (${shown})`
    } else {
      enrichDetail = ratio
    }
  }
  return { legs: out, enrichAttempted, enrichedCount, enrichDetail, authRejected }
}

const FCV_ID_IN_CHUNK = 120

/**
 * Skip AeroDataBox for legs already in the logbook so Fetch does not burn quota on hidden rows.
 * Returns an empty set if the logbook query fails so enrichment still runs.
 */
async function loadEnrichSkipIndices(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  legs: AirlineLeg[]
): Promise<Set<number>> {
  if (legs.length === 0) return new Set()

  const flights = legs.map(mapAirlineLegToFcvMappedEntry)
  const dates = [
    ...new Set(flights.map((f) => f.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))),
  ]
  const previewFcvIds = [
    ...new Set(
      flights.map((f) => String(f.fcv_flight_id ?? '').trim()).filter((id) => id.length > 0)
    ),
  ]

  const existingFcvIds = new Set<string>()
  for (let i = 0; i < previewFcvIds.length; i += FCV_ID_IN_CHUNK) {
    const chunk = previewFcvIds.slice(i, i + FCV_ID_IN_CHUNK)
    const { data, error } = await supabase
      .from('log_entries')
      .select('fcv_flight_id')
      .eq('user_id', userId)
      .in('fcv_flight_id', chunk)
    if (error) {
      console.error('fetch-flica skip-enrich fcv_flight_id query:', error)
      return new Set()
    }
    for (const row of data ?? []) {
      const id = typeof row.fcv_flight_id === 'string' ? row.fcv_flight_id.trim() : ''
      if (id) existingFcvIds.add(id)
    }
  }

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
      console.error('fetch-flica skip-enrich log_entries query:', error)
      return new Set()
    }
    existingEntries = (rows ?? []).map((row) => logEntryRowToExistingForDedup(row))
  }

  const part = partitionFcvPreviewDuplicates(flights, existingEntries, existingFcvIds)
  return new Set(part.duplicateIndices)
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
  const nowMs = Date.now()
  const todayYmd = DateTime.fromMillis(nowMs, { zone: FLICA_DEFAULT_NOW_ZONE }).toFormat(
    'yyyy-MM-dd'
  )
  const dateFrom =
    typeof body.dateFrom === 'string' && body.dateFrom.trim()
      ? body.dateFrom.trim()
      : todayYmd
  const dateTo =
    typeof body.dateTo === 'string' && body.dateTo.trim()
      ? body.dateTo.trim()
      : dateFrom
  const includeScheduled = body.includeScheduled === true
  const includeDeadheads = body.includeDeadheads === true

  let scheduleHtml: string
  let session!: FlicaSession
  try {
    session = await loginFlica({
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

  const defaultYear = parseInt(dateFrom.slice(0, 4), 10)
  const parseOpts = {
    defaultYear: Number.isFinite(defaultYear) ? defaultYear : undefined,
  }
  const htmlSummary = summarizeFlicaHtml(scheduleHtml)
  const flicaLastUpdatedMs = parseFlicaLastUpdatedMs(scheduleHtml)
  const flicaLastUpdated = flicaLastUpdatedMs
    ? DateTime.fromMillis(flicaLastUpdatedMs).toUTC().toISO()
    : null
  console.info('[flica] schedule html', {
    bytes: htmlSummary.bytes,
    trips: htmlSummary.tripCount,
    hasL7G13: htmlSummary.hasL7G13,
    has4442: htmlSummary.has4442,
  })
  let parsed = parseFlicaSchedule(scheduleHtml, parseOpts)
  try {
    const pairingLegs = await fetchFlicaPairingOverlays(session, scheduleHtml, {
      dateFrom,
      dateTo,
      defaultYear: parseOpts.defaultYear,
    })
    if (pairingLegs.length > 0) {
      parsed = overlayFlicaPairingLegs(parsed, pairingLegs)
    }
  } catch {
    /* month HTML is still usable */
  }

  const pre = filterAirlineLegsWithStats(parsed, {
    dateFrom,
    dateTo,
    includeDeadheads,
    includeScheduled: true,
    excludeAfterYmd: includeScheduled ? undefined : todayYmd,
    nowMs,
    todayYmd,
  })

  const skipEnrich = await loadEnrichSkipIndices(supabase, userId, pre.filtered)
  const {
    legs: enriched,
    enrichAttempted,
    enrichedCount,
    enrichDetail,
    authRejected,
  } = await enrichLegsSequential(pre.filtered, dateTo, portal.airlineCode, skipEnrich)

  const post = includeScheduled
    ? {
        filtered: enriched,
        excludedDeadheads: 0,
        excludedOutsideRange: 0,
        excludedScheduled: 0,
      }
    : filterAirlineLegsWithStats(enriched, {
        includeDeadheads: true,
        includeScheduled: false,
        nowMs,
        todayYmd,
      })

  const filtered = post.filtered
  const excludedDeadheads = pre.excludedDeadheads
  const excludedOutsideRange = pre.excludedOutsideRange
  const excludedScheduled = pre.excludedScheduled + post.excludedScheduled
  const mapped: FcvMappedEntry[] = filtered.map(mapAirlineLegToFcvMappedEntry)

  const warningParts: string[] = []
  if (!isAeroDataBoxConfigured() && filtered.length > 0) {
    warningParts.push(
      'Schedule enrichment is not configured (AERODATABOX_API_KEY). Tail and actual times were not added.'
    )
  } else if (authRejected) {
    warningParts.push('AeroDataBox rejected the API key. Tail and actual times were not added.')
  } else if (enrichAttempted > 0 && enrichedCount === 0) {
    warningParts.push(
      enrichDetail
        ? `Could not enrich flights from AeroDataBox. ${enrichDetail}. Preview shows FLICA schedule times only.`
        : `Could not enrich ${enrichAttempted} flight(s) from AeroDataBox. Preview shows FLICA schedule times only.`
    )
  }
  if (parsed.length === 0) {
    warningParts.push(
      `FLICA schedule HTML loaded (${htmlSummary.bytes} bytes, ${htmlSummary.tripCount} trip header(s), L7G13=${htmlSummary.hasL7G13 ? 'yes' : 'no'}, 4442=${htmlSummary.has4442 ? 'yes' : 'no'}) but no flight legs were recognized.` +
        (htmlSummary.sample ? ` Sample: "${htmlSummary.sample}"` : '')
    )
  } else if (mapped.length === 0) {
    const bits: string[] = []
    if (excludedDeadheads > 0) {
      bits.push(`${excludedDeadheads} deadhead(s) — enable Include deadheads`)
    }
    if (excludedOutsideRange > 0) {
      bits.push(`${excludedOutsideRange} outside your date range`)
    }
    if (excludedScheduled > 0) {
      bits.push(`${excludedScheduled} future scheduled — enable Include scheduled`)
    }
    warningParts.push(
      bits.length > 0
        ? `Parsed ${parsed.length} leg(s) but none to import (${bits.join('; ')}).`
        : `Parsed ${parsed.length} leg(s) but none matched your filters.`
    )
  }

  return {
    success: true,
    flights: mapped,
    count: mapped.length,
    parsedCount: parsed.length,
    filteredCount: filtered.length,
    excludedDeadheads,
    excludedOutsideRange,
    excludedScheduled,
    htmlBytes: htmlSummary.bytes,
    enrichAttempted,
    enrichedCount,
    enrichDetail: enrichDetail ?? undefined,
    flicaLastUpdated: flicaLastUpdated ?? undefined,
    warning: warningParts.length > 0 ? warningParts.join(' ') : undefined,
  }
})
