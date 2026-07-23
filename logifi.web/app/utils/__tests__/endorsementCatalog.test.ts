import { describe, expect, it } from 'vitest'
import {
  ENDORSEMENT_CATALOG,
  computeEndorsementExpiresAt,
  getEndorsementTemplate,
  missingEndorsementFields,
  renderEndorsementBody,
} from '../endorsementCatalog'

describe('endorsementCatalog', () => {
  it('includes full AC 61-65H Appendix A (A.1–A.92)', () => {
    expect(ENDORSEMENT_CATALOG).toHaveLength(92)
    for (let i = 1; i <= 92; i++) {
      expect(getEndorsementTemplate(`A.${i}`)).toBeTruthy()
    }
  })

  it('renders placeholders and reports missing fields', () => {
    const t = getEndorsementTemplate('A.6')!
    expect(t.validityDays).toBe(90)
    const missing = missingEndorsementFields(t.body, { student_name: 'Ada Lovelace' })
    expect(missing).toContain('make_model')
    expect(missing).toContain('he_or_she')
    const rendered = renderEndorsementBody(t.body, {
      student_name: 'Ada Lovelace',
      he_or_she: 'she',
      make_model: 'Cessna 172S',
    })
    expect(rendered).toContain('Ada Lovelace')
    expect(rendered).toContain('Cessna 172S')
    expect(rendered).not.toMatch(/\{\{/)
  })

  it('computes expiry from validityDays', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const expires = computeEndorsementExpiresAt({ validityDays: 90 }, from)
    expect(expires).toBe('2026-04-01T00:00:00.000Z')
    expect(computeEndorsementExpiresAt({}, from)).toBeNull()
  })
})
