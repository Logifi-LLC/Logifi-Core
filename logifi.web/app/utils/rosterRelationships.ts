import type { Database } from '~/types/database'

type Relationship = Database['public']['Tables']['instructor_student_relationships']['Row']

/** ACTIVE links can PIN-sign (no expiry). */
export function isRosterRelationshipSignable(
  row: Pick<Relationship, 'status'>
): boolean {
  return row.status === 'ACTIVE'
}

export function isMainInstructorRelationship(
  row: Pick<Relationship, 'relationship_kind'>
): boolean {
  return row.relationship_kind === 'main'
}
