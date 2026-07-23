import { describe, expect, it } from 'vitest'
import { formatEndorsementSignatureBlock, isPaperImportedEndorsement } from '../endorsementSignature'

describe('formatEndorsementSignatureBlock', () => {
  it('formats a full official signature line', () => {
    const line = formatEndorsementSignatureBlock({
      signed_at: '2026-07-23T15:00:00.000Z',
      instructor_full_name: 'Jane Instructor',
      cfi_number: '4170037',
      cfi_expiration: '2027-12-31',
    })
    expect(line).toContain('/s/ Jane Instructor')
    expect(line).toContain('4170037CFI')
    expect(line).toContain('Exp.')
  })

  it('notes missing name for legacy signed rows', () => {
    const line = formatEndorsementSignatureBlock({
      signed_at: '2026-07-23T15:00:00.000Z',
      instructor_full_name: null,
      cfi_number: '4170037',
      cfi_expiration: null,
    })
    expect(line).toContain('(name not recorded)')
    expect(line).toContain('4170037CFI')
  })

  it('detects paper imports', () => {
    expect(isPaperImportedEndorsement({ status: 'imported', is_imported: true })).toBe(true)
    expect(isPaperImportedEndorsement({ status: 'signed', is_imported: false })).toBe(false)
  })
})
