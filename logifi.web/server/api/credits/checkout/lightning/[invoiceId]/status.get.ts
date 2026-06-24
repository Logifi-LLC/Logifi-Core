import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getUserIdFromEvent } from '../../../../../utils/supabase'
import { isLightningConfigured } from '../../../../../utils/lightningEnv'
import { fetchLightningInvoiceStatus } from '../../../../../utils/lightningProvider'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!isLightningConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Lightning is not configured' })
  }

  const invoiceId = getRouterParam(event, 'invoiceId')
  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invoice id' })
  }

  const { status, paid } = await fetchLightningInvoiceStatus(invoiceId)
  return {
    invoiceId,
    status,
    paid,
  }
})
