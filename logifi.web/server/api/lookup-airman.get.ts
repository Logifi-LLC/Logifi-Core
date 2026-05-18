/**
 * FAA Airmen Registry lookup — certificates & ratings for pilot profile autofill.
 *
 * Query params:
 * - lastName (required)
 * - certificateNumber (required)
 * - firstName (optional, narrows search)
 * - eventTarget (optional, from MULTIPLE_MATCHES disambiguation)
 */

import {
  lookupAirmanFromFaa,
  type AirmanRegistryCandidate,
  type AirmanRegistryData,
} from '../utils/faaAirmenInquiry'

export type { AirmanRegistryCandidate, AirmanRegistryData }

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lastName = String(query.lastName ?? '').trim()
  const certificateNumber = String(query.certificateNumber ?? '').trim()
  const firstName = String(query.firstName ?? '').trim() || undefined
  const eventTarget = String(query.eventTarget ?? '').trim() || undefined

  const result = await lookupAirmanFromFaa({
    lastName,
    certificateNumber,
    firstName,
    eventTarget,
  })

  if (result.ok) {
    return { success: true as const, data: result.data }
  }

  if ('code' in result && result.code === 'MULTIPLE_MATCHES') {
    return {
      success: false as const,
      code: result.code,
      message: result.message,
      candidates: result.candidates,
    }
  }

  return {
    success: false as const,
    error: result.error,
  }
})
