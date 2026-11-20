import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('spa index prerender', () => {
  it('does not prerender /index.html into the same file as /', () => {
    const config = readFileSync(path.resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("route.route === '/index.html'")
    expect(config).toContain('route.skip = true')
    expect(config).toContain("routes: ['/']")
  })
})
