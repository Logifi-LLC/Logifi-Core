import { classifyLocationCode } from '../utils/locationClassification'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const code = query.code as string

  if (!code?.trim()) {
    return { success: false, error: 'Location code is required' }
  }

  const classified = classifyLocationCode(code)
  if (classified.kind === 'unknown') {
    return { success: false, error: 'Location not found' }
  }

  return {
    success: true,
    data: classified
  }
})
