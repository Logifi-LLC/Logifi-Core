import type { EndorsementRow } from '~/utils/endorsementIndexedDB'
import type { EndorsementTemplate } from '~/utils/endorsementCatalog'

export function newEndorsementId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `endorsement-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function buildPendingEndorsementRow(input: {
  id: string
  studentId: string
  instructorId: string
  status: 'pending' | 'draft'
  template: EndorsementTemplate
  fieldValues: Record<string, string>
  renderedBody: string
  expiresAt: string | null
}): EndorsementRow {
  const now = new Date().toISOString()
  const { template, fieldValues } = input
  return {
    id: input.id,
    student_id: input.studentId,
    instructor_id: input.instructorId,
    template_code: template.code,
    regulation_refs: template.regulationRefs,
    title: template.title,
    body_template: template.body,
    field_values: fieldValues,
    rendered_body: input.renderedBody,
    status: input.status,
    expires_at: input.expiresAt,
    signed_at: null,
    signature_hash: null,
    cfi_number: null,
    cfi_expiration: null,
    instructor_full_name: null,
    is_imported: false,
    import_source: null,
    created_at: now,
    updated_at: now,
  }
}

export function buildImportedEndorsementRow(input: {
  id: string
  studentId: string
  record: {
    template: EndorsementTemplate
    fieldValues: Record<string, string>
    instructorFullName: string
    cfiNumber?: string
    cfiExpiration?: string | null
    paperSignedAt: string
  }
  renderedBody: string
  expiresAt: string | null
}): EndorsementRow {
  const now = new Date().toISOString()
  const signedAt = input.record.paperSignedAt || now
  return {
    id: input.id,
    student_id: input.studentId,
    instructor_id: null,
    template_code: input.record.template.code,
    regulation_refs: input.record.template.regulationRefs,
    title: input.record.template.title,
    body_template: input.record.template.body,
    field_values: input.record.fieldValues,
    rendered_body: input.renderedBody,
    status: 'imported',
    expires_at: input.expiresAt,
    signed_at: signedAt,
    signature_hash: null,
    cfi_number: input.record.cfiNumber?.trim() || null,
    cfi_expiration: input.record.cfiExpiration?.trim() || null,
    instructor_full_name: input.record.instructorFullName.trim(),
    is_imported: true,
    import_source: 'paper_manual',
    created_at: now,
    updated_at: now,
  }
}

export function applyLocalSignedSnapshot(
  row: EndorsementRow,
  snapshot: {
    cfiNumber: string | null
    cfiExpiration: string | null
    instructorFullName: string | null
    signedAtIso: string
  }
): EndorsementRow {
  return {
    ...row,
    status: 'signed',
    signed_at: snapshot.signedAtIso,
    cfi_number: snapshot.cfiNumber,
    cfi_expiration: snapshot.cfiExpiration,
    instructor_full_name: snapshot.instructorFullName,
    signature_hash: 'pending-local',
    updated_at: new Date().toISOString(),
  }
}