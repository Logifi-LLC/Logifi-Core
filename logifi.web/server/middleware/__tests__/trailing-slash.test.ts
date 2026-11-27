import { describe, expect, it } from 'vitest'
import { isPassthroughDocumentPath } from '../../utils/spaDocumentStatus'

describe('trailing-slash redirect guardrails', () => {
  it('skips root, API, Nuxt internals, and dotted static paths', () => {
    expect(isPassthroughDocumentPath('/')).toBe(false)
    expect(isPassthroughDocumentPath('/api/digifi/scan')).toBe(true)
    expect(isPassthroughDocumentPath('/_nuxt/foo.js')).toBe(true)
    expect(isPassthroughDocumentPath('/sitemap.xml')).toBe(true)
    expect(isPassthroughDocumentPath('/llms.txt/')).toBe(true)
  })

  it('treats marketing paths with trailing slashes as HTML documents', () => {
    expect(isPassthroughDocumentPath('/faq/')).toBe(false)
    expect(isPassthroughDocumentPath('/how-to-digitize-a-paper-pilot-logbook/')).toBe(false)
  })
})