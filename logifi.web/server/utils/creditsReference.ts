/** Postgres unique_violation — duplicate credit_transactions.reference_id */
export const PG_UNIQUE_VIOLATION = '23505'

export class CreditReferenceDuplicateError extends Error {
  constructor() {
    super('Credit reference already granted')
    this.name = 'CreditReferenceDuplicateError'
  }
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  return code === PG_UNIQUE_VIOLATION
}
