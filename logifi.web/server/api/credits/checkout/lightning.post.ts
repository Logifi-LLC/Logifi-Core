import { createError, defineEventHandler, readBody } from 'h3'
import { getRequestURL } from 'h3'
import { getUserIdFromEvent } from '../../../utils/supabase'
import { isLightningConfigured } from '../../../utils/lightningEnv'
import { createLightningCreditsInvoice } from '../../../utils/lightningProvider'
import { pricingForLightningCredits } from '../../../utils/lightningBtcpay'
import { totalDollarsFromCents, validatePurchase } from '../../../utils/creditsPricing'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!isLightningConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Lightning payments are not configured on this server',
    })
  }

  const body = await readBody(event)
  const numberOfCredits =
    typeof body?.numberOfCredits === 'number'
      ? body.numberOfCredits
      : Number.parseInt(String(body?.numberOfCredits ?? ''), 10)

  const validation = validatePurchase('lightning', numberOfCredits)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.error })
  }

  const pricing = pricingForLightningCredits(numberOfCredits)
  const requestOrigin = getRequestURL(event).origin
  const invoice = await createLightningCreditsInvoice({
    userId,
    numberOfCredits,
    totalCents: pricing.totalCents,
    requestOrigin,
  })

  return {
    ok: true as const,
    invoiceId: invoice.invoiceId,
    checkoutLink: invoice.checkoutLink,
    bolt11: invoice.bolt11,
    numberOfCredits,
    totalCents: pricing.totalCents,
    totalDollars: totalDollarsFromCents(pricing.totalCents),
    rateCentsPerPage: pricing.rateCentsPerPage,
  }
})
