import type { EndorsementsAccountRole } from '~/utils/endorsementsPageLoad'

export function canSignEndorsementLocally(input: {
  callerUserId: string
  instructorId: string | null
  role: EndorsementsAccountRole | null
}): { allowed: boolean; reason?: string } {
  if (!input.role || (input.role !== 'INSTRUCTOR' && input.role !== 'DUAL')) {
    return { allowed: false, reason: 'Only instructors can sign endorsements' }
  }
  if (!input.instructorId || input.instructorId !== input.callerUserId) {
    return { allowed: false, reason: 'Only the assigned instructor can sign this endorsement' }
  }
  return { allowed: true }
}