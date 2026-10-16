import { defineEventHandler, getRequestURL, setResponseHeader, setResponseStatus } from 'h3'
import { appleAppSiteAssociation } from '../../shared/referrals'

/** Apple fetches this path directly. It must be JSON and must not redirect. */
export default defineEventHandler((event) => {
  if (getRequestURL(event).pathname !== '/.well-known/apple-app-site-association') return
  setResponseStatus(event, 200)
  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return appleAppSiteAssociation()
})
