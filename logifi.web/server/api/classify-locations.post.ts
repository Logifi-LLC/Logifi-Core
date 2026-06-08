import { classifyLocationCodes } from '../utils/locationClassification'

const MAX_BATCH_SIZE = 100

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const codes = Array.isArray(body?.codes) ? body.codes as string[] : []

  if (codes.length === 0) {
    return { success: true, results: {} as Record<string, 'airport' | 'navaid' | 'unknown'> }
  }

  if (codes.length > MAX_BATCH_SIZE) {
    return {
      success: false,
      error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`
    }
  }

  const results = classifyLocationCodes(codes)
  return { success: true, results }
})
