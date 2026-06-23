import { createError, defineEventHandler } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../../utils/supabase'

interface SessionRow {
  id: string
  token: string
  expires_at: string
  created_at: string
}

interface SessionPhotoCountRow {
  session_id: string
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const nowIso = new Date().toISOString()
  const supabase = getSupabaseClient(event)
  const { data, error } = await supabase
    .from('digifi_capture_sessions')
    .select('id, token, expires_at, created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('[digifi-capture] session list failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load capture sessions' })
  }

  const sessions = (data ?? []) as SessionRow[]
  const sessionIds = sessions.map((session) => session.id)
  let photoCountBySession = new Map<string, number>()

  if (sessionIds.length > 0) {
    const { data: photos, error: photosError } = await supabase
      .from('digifi_capture_photos')
      .select('session_id')
      .in('session_id', sessionIds)

    if (photosError) {
      console.error('[digifi-capture] session photo counts failed:', photosError.message)
      throw createError({ statusCode: 500, statusMessage: 'Could not load capture session photos' })
    }

    const counts = new Map<string, number>()
    for (const row of (photos ?? []) as SessionPhotoCountRow[]) {
      counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1)
    }
    photoCountBySession = counts
  }

  return {
    ok: true as const,
    sessions: sessions.map((session) => ({
      sessionId: session.id,
      token: session.token,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      photoCount: photoCountBySession.get(session.id) ?? 0,
    })),
  }
})
