import { getLightningEnv } from './lightningEnv'
import { totalDollarsFromCents, calculatePurchaseTotal } from './creditsPricing'

export interface LightningInvoiceResult {
  invoiceId: string
  checkoutLink: string | null
  bolt11: string | null
  amountCents: number
}

interface BtcpayInvoiceResponse {
  id: string
  checkoutLink?: string
  checkoutLinkId?: string
  amount?: string
  currency?: string
  status?: string
}

export async function createBtcpayCreditsInvoice(input: {
  userId: string
  numberOfCredits: number
  totalCents: number
}): Promise<LightningInvoiceResult> {
  const env = getLightningEnv()
  if (!env.btcpayHost || !env.btcpayApiKey || !env.btcpayStoreId) {
    throw new Error('Lightning (BTCPay) is not configured on this server')
  }

  const amountDollars = totalDollarsFromCents(input.totalCents)
  const url = `${env.btcpayHost}/api/v1/stores/${encodeURIComponent(env.btcpayStoreId)}/invoices`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${env.btcpayApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountDollars.toFixed(2),
      currency: 'USD',
      metadata: {
        userId: input.userId,
        numberOfCredits: String(input.numberOfCredits),
        purpose: 'digifi_credits',
      },
      checkout: {
        speedPolicy: 'MediumSpeed',
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[lightning] BTCPay invoice create failed:', response.status, text)
    throw new Error('Could not create Lightning invoice')
  }

  const data = (await response.json()) as BtcpayInvoiceResponse
  const checkoutLink =
    data.checkoutLink ??
    (data.checkoutLinkId ? `${env.btcpayHost}/i/${data.checkoutLinkId}` : null)

  return {
    invoiceId: data.id,
    checkoutLink,
    bolt11: null,
    amountCents: input.totalCents,
  }
}

export async function fetchBtcpayInvoiceStatus(invoiceId: string): Promise<string> {
  const data = await fetchBtcpayInvoice(invoiceId)
  return data.status ?? 'Unknown'
}

export async function fetchBtcpayInvoice(invoiceId: string): Promise<{
  status?: string
  metadata?: Record<string, string>
}> {
  const env = getLightningEnv()
  if (!env.btcpayHost || !env.btcpayApiKey || !env.btcpayStoreId) {
    throw new Error('Lightning (BTCPay) is not configured on this server')
  }

  const url = `${env.btcpayHost}/api/v1/stores/${encodeURIComponent(env.btcpayStoreId)}/invoices/${encodeURIComponent(invoiceId)}`
  const response = await fetch(url, {
    headers: { Authorization: `token ${env.btcpayApiKey}` },
  })

  if (!response.ok) {
    throw new Error('Could not fetch Lightning invoice status')
  }

  return (await response.json()) as { status?: string; metadata?: Record<string, string> }
}

export function pricingForLightningCredits(numberOfCredits: number) {
  const pricing = calculatePurchaseTotal('lightning', numberOfCredits)
  if (!pricing.valid) {
    throw new Error(pricing.error ?? 'Invalid Lightning purchase')
  }
  return pricing
}
