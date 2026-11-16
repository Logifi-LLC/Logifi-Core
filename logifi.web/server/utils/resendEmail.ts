const RESEND_EMAILS_URL = 'https://api.resend.com/emails'
const DEFAULT_FROM_EMAIL = 'info@logifi.io'

export function resendFromHeader(envFrom?: string | null): string {
  const configured = envFrom?.trim()
  const address = configured || DEFAULT_FROM_EMAIL
  if (address.includes('<') && address.includes('>')) return address
  return `Logifi <${address}>`
}

export async function sendResendEmail(args: {
  apiKey: string
  to: string
  subject: string
  text: string
  html?: string
  from?: string
}): Promise<{ ok: boolean; status: number; detail: string }> {
  const res = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: args.from || resendFromHeader(process.env.LOGBOOK_TRANSFER_FROM_EMAIL),
      to: [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html || undefined,
    }),
  })
  const detail = await res.text().catch(() => '')
  return { ok: res.ok, status: res.status, detail: detail.slice(0, 300) }
}

export { RESEND_EMAILS_URL, DEFAULT_FROM_EMAIL }
