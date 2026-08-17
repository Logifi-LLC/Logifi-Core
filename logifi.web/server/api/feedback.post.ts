import { defineEventHandler, readBody, createError } from 'h3'

interface FeedbackPayload {
  type: 'bug' | 'feature' | 'other'
  subject: string
  message: string
  email?: string
  website?: string
}

function discordPayload(type: string, subject: string, message: string, email: string) {
  const lines = [
    `**Type:** ${type}`,
    `**Subject:** ${subject}`,
    email ? `**Email:** ${email}` : '',
    '',
    message,
  ].filter(Boolean)

  return { content: lines.join('\n') }
}

function slackPayload(type: string, subject: string, message: string, email: string) {
  const lines = [
    `*Type:* ${type}`,
    `*Subject:* ${subject}`,
    email ? `*Email:* ${email}` : '',
    '',
    message,
  ].filter(Boolean)

  return { text: lines.join('\n') }
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as FeedbackPayload

  const subject = (body.subject || '').trim()
  const message = (body.message || '').trim()
  const type = body.type
  const email = (body.email || '').trim()
  const website = (body.website || '').trim()

  if (website) {
    // Honeypot filled -> likely bot; pretend success without sending to webhook
    return { success: true }
  }

  if (!subject || !message || !type || !['bug', 'feature', 'other'].includes(type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid feedback payload',
    })
  }

  const webhookUrl =
    type === 'bug'
      ? process.env.SLACK_BUGS_WEBHOOK
      : process.env.DISCORD_FEEDBACK_WEBHOOK

  if (!webhookUrl) {
    return { success: false, notConfigured: true }
  }

  const payload =
    type === 'bug'
      ? slackPayload(type, subject, message, email)
      : discordPayload(type, subject, message, email)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Webhook returned ${res.status}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending feedback webhook:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send feedback',
    })
  }
})
