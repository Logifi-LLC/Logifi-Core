import { describe, expect, it } from 'vitest'
import { LEGACY_ENDORSEMENT_CATALOG } from '../endorsementCatalogLegacy'
import {
  ENDORSEMENT_CATALOG,
  computeEndorsementExpiresAt,
  endorsementBodyHasScrapeArtifacts,
  endorsementRouteReusesAirportPlaceholder,
  getEndorsementTemplate,
  missingEndorsementFields,
  renderEndorsementBody,
} from '../endorsementCatalog'

describe('endorsementCatalog', () => {
  it('includes full AC 61-65K Appendix A (A.1–A.96) for new issue', () => {
    expect(ENDORSEMENT_CATALOG).toHaveLength(96)
    for (let i = 1; i <= 96; i++) {
      expect(getEndorsementTemplate(`A.${i}`)?.code).toBe(`A.${i}`)
    }
  })

  it('keeps 61-65H template ids resolvable and hidden from the issuable catalog', () => {
    expect(LEGACY_ENDORSEMENT_CATALOG).toHaveLength(92)
    const currentA32 = getEndorsementTemplate('A.32')
    const legacyA32 = getEndorsementTemplate('A.32', { edition: '61-65H' })
    const prefixed = getEndorsementTemplate('61-65H:A.32')
    expect(currentA32?.title).toMatch(/Recreational pilot to act as PIC/)
    expect(legacyA32?.title).toMatch(/Aeronautical knowledge test/)
    expect(prefixed?.title).toBe(legacyA32?.title)
    expect(ENDORSEMENT_CATALOG.some((t) => t.title === legacyA32?.title)).toBe(false)
  })

  it('renders placeholders and reports missing fields', () => {
    const t = getEndorsementTemplate('A.6')!
    expect(t.validityDays).toBe(90)
    const missing = missingEndorsementFields(t.body, { student_name: 'Ada Lovelace' })
    expect(missing).toContain('make_model')
    const rendered = renderEndorsementBody(t.body, {
      student_name: 'Ada Lovelace',
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

  it('detects scrape leftovers and duplicated route airports', () => {
    expect(endorsementBodyHasScrapeArtifacts('I certify. STUDENT PILOT ENDORSEMENTS')).toBe(true)
    expect(endorsementBodyHasScrapeArtifacts('planning Appendix A A-8')).toBe(true)
    expect(
      endorsementRouteReusesAirportPlaceholder(
        'solo flight from {{departure_airport}} to {{departure_airport}} via {{route}}'
      )
    ).toBe(true)
    expect(
      endorsementRouteReusesAirportPlaceholder(
        'solo flight from {{departure_airport}} to {{destination_airport}} via {{route}}'
      )
    ).toBe(false)
  })

  it('rejects scrape leftovers and reused route-airport placeholders in issuable bodies', () => {
    for (const template of ENDORSEMENT_CATALOG) {
      expect(
        endorsementBodyHasScrapeArtifacts(template.body),
        `${template.code} body has PDF scrape leftover`
      ).toBe(false)
      expect(
        endorsementRouteReusesAirportPlaceholder(template.body),
        `${template.code} reuses one airport placeholder on a from/to route`
      ).toBe(false)
    }
    const xc = getEndorsementTemplate('A.10')!
    expect(xc.body).toContain('{{departure_airport}}')
    expect(xc.body).toContain('{{destination_airport}}')
    expect(xc.body).not.toMatch(/from \{\{departure_airport\}\} to \{\{departure_airport\}\}/)
  })
})
