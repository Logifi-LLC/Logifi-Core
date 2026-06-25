import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { resolveLightningReturnDestination } from '../../../../utils/lightningOpennode'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const token = typeof query.r === 'string' ? query.r : undefined
  const destination = resolveLightningReturnDestination(token)

  if (!destination) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid return URL' })
  }

  return sendRedirect(event, destination, 302)
})
