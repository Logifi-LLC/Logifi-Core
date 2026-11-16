import { createError, defineEventHandler, readBody } from 'h3'
import { getSupabaseClient, getUserIdFromEvent } from '../utils/supabase'
import { getSupabaseServiceClient } from '../utils/supabaseService'
import { getCompanionCaptureOrigin } from '../utils/digifiCapture'
import { sendResendEmail } from '../utils/resendEmail'
import { signatureRequestRateLimitExceeded } from '../utils/signatureRequestRateLimit'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function hoursFromFlightTime(flightTime: unknown): string {
  if (!flightTime || typeof flightTime !== 'object') return '0.0'
  const dual = Number((flightTime as { dual?: unknown }).dual ?? 0)
  const total = Number((flightTime as { total?: unknown }).total ?? 0)
  const value = Number.isFinite(dual) && dual > 0 ? dual : total
  if (!Number.isFinite(value)) return '0.0'
  return value.toFixed(1)
}

function routeLine(departure: string | null, destination: string | null): string {
  return `${departure || '—'} → ${destination || '—'}`
}

function aircraftLine(registration: string | null, makeModel: string | null): string {
  const ident = (registration || '').trim()
  const type = (makeModel || '').trim()
  if (ident && type) return `${ident} · ${type}`
  return ident || type || '—'
}

function buildEmail(args: {
  date: string
  aircraft: string
  route: string
  duration: string
  reviewUrl: string
}): { subject: string; text: string; html: string } {
  const subject = 'Logifi: signature requested'
  const text = [
    'A student requested your instructor signature.',
    '',
    `Date: ${args.date}`,
    `Aircraft: ${args.aircraft}`,
    `Route: ${args.route}`,
    `Duration: ${args.duration} hours`,
    '',
    'Review and sign while signed in to Logifi:',
    args.reviewUrl,
  ].join('\n')
  const html = [
    '<p>A student requested your instructor signature.</p>',
    `<p>Date: ${args.date}<br/>Aircraft: ${args.aircraft}<br/>Route: ${args.route}<br/>Duration: ${args.duration} hours</p>`,
    `<p><a href="${args.reviewUrl}">Review and sign</a> while signed in to Logifi.</p>`,
  ].join('')
  return { subject, text, html }
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody<{ entryId?: string }>(event)) || {}
  const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : ''
  if (!UUID_RE.test(entryId)) {
    throw createError({ statusCode: 400, statusMessage: 'entryId is required' })
  }

  const limited = signatureRequestRateLimitExceeded({ userId, entryId })
  if (limited === 'entry') {
    throw createError({
      statusCode: 429,
      statusMessage: 'Wait a few minutes before requesting another signature for this flight',
    })
  }
  if (limited === 'user') {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many signature requests. Try again later.',
    })
  }

  const supabase = getSupabaseClient(event)
  const { data: entry, error: entryError } = await supabase
    .from('log_entries')
    .select(
      'id, user_id, date, departure, destination, registration, aircraft_make_model, flight_time, signature_pending, pending_instructor_id'
    )
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle()

  if (entryError) {
    console.error('[signature-request] entry lookup failed:', entryError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load entry' })
  }
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }
  if (entry.signature_pending !== true || !entry.pending_instructor_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entry is not pending an instructor signature',
    })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Mail service is not configured' })
  }

  const { data: instructor, error: instructorError } = await service.auth.admin.getUserById(
    entry.pending_instructor_id
  )
  if (instructorError) {
    console.error('[signature-request] instructor lookup failed:', instructorError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load instructor' })
  }
  const instructorEmail = instructor.user?.email?.trim()
  if (!instructorEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Instructor has no email on file',
    })
  }

  const { count, error: countError } = await service
    .from('signature_request_emails')
    .select('id', { count: 'exact', head: true })
    .eq('log_entry_id', entryId)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

  if (countError) {
    console.error('[signature-request] rate log lookup failed:', countError.message)
  } else if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Wait a few minutes before requesting another signature for this flight',
    })
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.log('[signature-request] RESEND_API_KEY unset; skipping email')
    return { ok: true as const, emailed: false }
  }

  const reviewUrl = `${getCompanionCaptureOrigin(event)}/dashboard?pendingSign=${entry.id}`
  const mail = buildEmail({
    date: (entry.date || '').toString().slice(0, 10),
    aircraft: aircraftLine(entry.registration, entry.aircraft_make_model),
    route: routeLine(entry.departure, entry.destination),
    duration: hoursFromFlightTime(entry.flight_time),
    reviewUrl,
  })

  const sent = await sendResendEmail({
    apiKey,
    to: instructorEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  })
  if (!sent.ok) {
    console.error('[signature-request] Resend returned', sent.status, sent.detail)
    throw createError({ statusCode: 502, statusMessage: 'Could not send signature request email' })
  }

  const { error: insertError } = await service.from('signature_request_emails').insert({
    student_id: userId,
    instructor_id: entry.pending_instructor_id,
    log_entry_id: entry.id,
  })
  if (insertError) {
    console.error('[signature-request] failed to log send:', insertError.message)
  }

  return { ok: true as const, emailed: true }
})
