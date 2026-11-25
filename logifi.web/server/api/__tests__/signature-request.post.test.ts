import { describe, expect, it } from 'vitest'
import { buildEmail } from '../signature-request.post'

describe('signature-request buildEmail', () => {
  it('escapes student-entered fields in the HTML body', () => {
    const mail = buildEmail({
      date: '2026-03-01',
      aircraft: 'N123AB · <a href="https://example.test">C172</a>',
      route: 'KAAA → <img src=x>',
      duration: '1.5',
      reviewUrl: 'https://app.example.test/dashboard?pendingSign=00000000-0000-4000-8000-000000000001',
    })

    expect(mail.html).not.toContain('<a href="https://example.test">')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('&lt;a href=&quot;https://example.test&quot;&gt;C172&lt;/a&gt;')
    expect(mail.html).toContain('<a href="https://app.example.test/dashboard?pendingSign=')
    expect(mail.text).toContain('Aircraft: N123AB · <a href="https://example.test">C172</a>')
  })
})
