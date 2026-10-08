import { defineEventHandler, getRequestHost, setResponseHeader } from 'h3'
import { robotsNoindexHeader } from '../../shared/publicSeo'

/** Keep *.vercel.app copies out of the index. www.logifi.io and logifi.io are unchanged. */
export default defineEventHandler((event) => {
  const header = robotsNoindexHeader(getRequestHost(event, { xForwardedHost: true }))
  if (!header) return
  setResponseHeader(event, 'X-Robots-Tag', header)
})
