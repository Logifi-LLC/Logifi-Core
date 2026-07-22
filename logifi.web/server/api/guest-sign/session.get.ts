import { createError, defineEventHandler, getQuery } from 'h3'
import { getSupabaseServiceClient } from '../../utils/supabaseService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token.trim() : ''
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Guest sign service is not configured' })
  }

  const { data: session, error } = await service
    .from('guest_sign_sessions')
    .select('id, status, expires_at, log_entry_id, user_id')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('[guest-sign] session lookup failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not validate session token' })
  }
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Guest sign session not found' })
  }

  const isExpired = new Date(session.expires_at).getTime() <= Date.now()
  if (session.status === 'pending' && isExpired) {
    await service
      .from('guest_sign_sessions')
      .update({ status: 'expired' })
      .eq('id', session.id)
  }

  const isPending = session.status === 'pending' && !isExpired

  const { data: entry } = await service
    .from('log_entries')
    .select('id, date, departure, destination, registration, aircraft_make_model')
    .eq('id', session.log_entry_id)
    .maybeSingle()

  const { data: existingSig } = await service
    .from('flight_signatures')
    .select('id')
    .eq('log_entry_id', session.log_entry_id)
    .maybeSingle()

  return {
    ok: true as const,
    sessionId: session.id,
    status: isExpired && session.status === 'pending' ? 'expired' : session.status,
    isPending,
    expiresAt: session.expires_at,
    alreadySigned: Boolean(existingSig),
    entry: entry
      ? {
          id: entry.id,
          date: entry.date,
          departure: entry.departure,
          destination: entry.destination,
          registration: entry.registration,
          aircraftMakeModel: entry.aircraft_make_model,
        }
      : null,
  }
})
