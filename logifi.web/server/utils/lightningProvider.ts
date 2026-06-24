import { getLightningEnv } from './lightningEnv'
import {
  createBtcpayCreditsInvoice,
  fetchBtcpayInvoiceStatus,
  type LightningInvoiceResult,
} from './lightningBtcpay'
import { createOpennodeCreditsCharge, fetchOpennodeChargeStatus } from './lightningOpennode'

const BTCPAY_SETTLED_STATUSES = new Set(['Settled', 'Complete', 'Paid'])

export async function createLightningCreditsInvoice(input: {
  userId: string
  numberOfCredits: number
  totalCents: number
  requestOrigin: string
}): Promise<LightningInvoiceResult> {
  const { provider } = getLightningEnv()

  if (provider === 'opennode') {
    return createOpennodeCreditsCharge(input)
  }

  if (provider === 'btcpay') {
    return createBtcpayCreditsInvoice({
      userId: input.userId,
      numberOfCredits: input.numberOfCredits,
      totalCents: input.totalCents,
    })
  }

  throw new Error('Lightning payments are not configured')
}

export async function fetchLightningInvoiceStatus(
  invoiceId: string
): Promise<{ status: string; paid: boolean }> {
  const { provider } = getLightningEnv()

  if (provider === 'opennode') {
    return fetchOpennodeChargeStatus(invoiceId)
  }

  if (provider === 'btcpay') {
    const status = await fetchBtcpayInvoiceStatus(invoiceId)
    return { status, paid: BTCPAY_SETTLED_STATUSES.has(status) }
  }

  throw new Error('Lightning payments are not configured')
}
