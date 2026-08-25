import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseClient, getUserIdFromEvent } from '../utils/supabase'

interface TransferRequestBody {
  sourceApp?: string | null
  note?: string | null
}

const SOURCE_APPS = new Set(['logten', 'foreflight', 'csv', 'other'])

function slackPayload(
  email: string,
  userId: string,
  sourceApp: string | null,
  note: string | null,
) {
  const lines = [
    '*Logbook transfer request*',
    `*Email:* ${email}`,
    `*User ID:* ${userId}`,
    sourceApp ? `*Source:* ${sourceApp}` : '',
    note ? `*Note:* ${note}` : '',
  ].filter(Boolean)

  return { text: lines.join('\n') }
}

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseClient(event)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event)) as TransferRequestBody
  const sourceAppRaw = typeof body?.sourceApp === 'string' ? body.sourceApp.trim().toLowerCase() : ''
  const sourceApp = sourceAppRaw && SOURCE_APPS.has(sourceAppRaw) ? sourceAppRaw : null
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) || null : null

  const { data: existing } = await supabase
    .from('logbook_transfer_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return { success: true, alreadyRequested: true }
  }

  const { error: insertError } = await supabase.from('logbook_transfer_requests').insert({
    user_id: userId,
    email: user.email,
    source_app: sourceApp,
    note,
    status: 'pending',
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: true, alreadyRequested: true }
    }
    console.error('[logbook-transfer-request] insert failed:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save transfer request' })
  }

  const webhookUrl = process.env.SLACK_LOGBOOK_TRANSFER_WEBHOOK
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload(user.email, userId, sourceApp, note)),
      })
      if (!res.ok) {
        console.error('[logbook-transfer-request] Slack webhook returned', res.status)
      }
    } catch (error) {
      console.error('[logbook-transfer-request] Slack webhook error:', error)
    }
  }

  return { success: true, alreadyRequested: false }
})
