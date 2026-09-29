import { defineEventHandler, getRequestURL, setResponseStatus } from 'h3'
import { isKnownAppPath, isPassthroughDocumentPath } from '../utils/spaDocumentStatus'

export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (isPassthroughDocumentPath(pathname) || isKnownAppPath(pathname)) return
  setResponseStatus(event, 404, 'Page Not Found')
})
