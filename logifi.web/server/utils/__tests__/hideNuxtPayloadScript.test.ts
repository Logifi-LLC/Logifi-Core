import { describe, expect, it } from 'vitest'
import { hideApplicationJsonScripts } from '../hideNuxtPayloadScript'

const PAYLOAD = '[{"serverRendered":2},1791546540727,false]'

describe('hideApplicationJsonScripts', () => {
  it('hides the Nuxt payload script and leaves the config script alone', () => {
    const html =
      `<div id="__nuxt"></div>` +
      `<script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__">${PAYLOAD}</script>` +
      `<script>window.__NUXT__={};window.__NUXT__.config={public:{}}</script>`

    const next = hideApplicationJsonScripts(html)

    expect(next).toContain(
      `<script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__" hidden style="display:none">${PAYLOAD}</script>`
    )
    expect(next).toContain('<script>window.__NUXT__={};window.__NUXT__.config={public:{}}</script>')
    expect(next).toContain('<div id="__nuxt"></div>')
  })

  it('escapes an embedded script close so the payload tail stays inside the tag', () => {
    const html =
      `<script type="application/json" id="__NUXT_DATA__">["</script>",{"serverRendered":2},1791546540727,false]</script>` +
      `<script>window.__NUXT__={}</script>`

    const next = hideApplicationJsonScripts(html)

    expect(next).not.toMatch(/<\/script>",/)
    expect(next).toContain('\\u003C/script>')
    expect(next).toContain('1791546540727,false]')
    expect(next).toContain('<script>window.__NUXT__={}</script>')
    expect(next.match(/id="__NUXT_DATA__"/g)).toHaveLength(1)
  })

  it('is idempotent', () => {
    const once = hideApplicationJsonScripts(
      `<script type="application/json" id="__NUXT_DATA__">${PAYLOAD}</script>`
    )
    expect(hideApplicationJsonScripts(once)).toBe(once)
  })
})
