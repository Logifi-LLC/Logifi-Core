import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getSupabaseServiceClient } from '../../../../utils/supabaseService'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Capture service is not configured' })
  }

  const { data: session, error } = await service
    .from('digifi_capture_sessions')
    .select('id, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('[digifi-capture] session lookup failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not validate session token' })
  }

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Capture session not found' })
  }

  const isExpired = new Date(session.expires_at).getTime() <= Date.now()
  const isActive = session.status === 'active' && !isExpired

  return {
    ok: true as const,
    sessionId: session.id,
    isActive,
    expiresAt: session.expires_at,
  }
})
