/**
 * Client-side mirror of sign_log_entry authorization.
 * The RPC is the real gate: auth.uid() must equal the instructor id.
 */

export function canAuthenticatedInstructorSign(args: {
  callerId: string | null | undefined
  instructorId: string | null | undefined
}): boolean {
  const caller = (args.callerId || '').trim()
  const instructor = (args.instructorId || '').trim()
  if (!caller || !instructor) return false
  return caller === instructor
}

export function ownerCannotSignAsInstructorError(): string {
  return 'only the instructor can sign this entry'
}
