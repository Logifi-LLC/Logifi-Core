import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'
import { isPassthroughDocumentPath } from '../utils/spaDocumentStatus'

/**
 * Canonical paths omit trailing slashes. Redirect /faq/ -> /faq (preserve query).
 * Skips /, /api/*, /_*, and static files with extensions.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const { pathname } = url
  if (pathname.length <= 1 || !pathname.endsWith('/')) return
  if (isPassthroughDocumentPath(pathname)) return
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const target = `${normalized}${url.search}`
  return sendRedirect(event, target, 308)
})