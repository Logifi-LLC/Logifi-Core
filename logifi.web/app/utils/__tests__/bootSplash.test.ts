import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { PUBLIC_MARKETING_PATHS } from '../../../shared/publicSeo'

const html = readFileSync(path.resolve(process.cwd(), 'app.html'), 'utf8')

function splashScript(): string {
  const start = html.indexOf('/* boot-splash:')
  const end = html.indexOf('</script>', start)
  expect(start).toBeGreaterThan(-1)
  const block = html.slice(start, end)
  const open = block.indexOf('(function')
  return block.slice(open)
}

function choose(pathname: string, native = false, protocol = 'https:'): string {
  const classes: string[] = []
  const sandbox = {
    window: native
      ? { Capacitor: { isNativePlatform: () => true } }
      : {},
    location: { pathname, protocol },
    document: {
      documentElement: {
        classList: {
          add(name: string) {
            classes.push(name)
          },
        },
      },
    },
  }
  vm.runInNewContext(splashScript(), sandbox)
  expect(classes).toHaveLength(1)
  return classes[0]
}

describe('boot splash variant', () => {
  it('uses the wordmark on each public marketing path in the browser', () => {
    for (const pathname of PUBLIC_MARKETING_PATHS) {
      expect(choose(pathname)).toBe('boot-wordmark')
      if (pathname !== '/') expect(choose(`${pathname}/`)).toBe('boot-wordmark')
    }
  })

  it('uses the propeller on app routes and inside Capacitor', () => {
    for (const pathname of ['/dashboard', '/dashboard/', '/logbook-builder', '/login', '/digifi-scan']) {
      expect(choose(pathname)).toBe('boot-propeller')
    }
    expect(choose('/', true)).toBe('boot-propeller')
    expect(choose('/pricing', true)).toBe('boot-propeller')
    // capacitor://localhost/ is pathname "/", and the bridge may not be injected yet.
    expect(choose('/', false, 'capacitor:')).toBe('boot-propeller')
    expect(choose('/index.html')).toBe('boot-propeller')
  })

  it('is the fragment Nuxt injects beside the app root', () => {
    const config = readFileSync(path.resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("spaLoadingTemplate: '../app.html'")
    expect(html.startsWith('<!--')).toBe(true)
    expect(html).not.toContain('{{ APP }}')
    expect(html).not.toContain('<!DOCTYPE')
    expect(html).not.toContain('</head>')
    expect(html).not.toContain('<body')
    expect(html).toContain('hide-nuxt-payload')
    expect(html).toContain("getElementById('__NUXT_DATA__')")
  })

  it('keeps the wordmark out of the propeller flex row', () => {
    const splash = html.slice(html.indexOf('id="app-splash"'), html.indexOf('hide-nuxt-payload'))
    const templateStart = splash.indexOf('<template id="boot-splash-wordmark">')
    const templateEnd = splash.indexOf('</template>')
    const wordmarkAt = splash.indexOf('class="loading-animation__mark loading-animation__mark--wordmark')
    expect(templateStart).toBeGreaterThan(-1)
    expect(wordmarkAt).toBeGreaterThan(templateStart)
    expect(wordmarkAt).toBeLessThan(templateEnd)
    expect(splash.indexOf('boot-splash__propeller')).toBeLessThan(templateStart)
    expect(splash).toContain("classList.contains('boot-wordmark')")
    expect(splash).toContain('cloneNode(true)')
    expect(html).toContain('svg.boot-splash__wordmark {\n        display: none !important;')
    expect(html).toContain('html.boot-wordmark svg.boot-splash__wordmark {\n        display: block !important;')
    const css = readFileSync(path.resolve(process.cwd(), 'app/assets/css/loading-animation.css'), 'utf8')
    expect(css).toContain('svg.boot-splash__wordmark {\n  display: none !important;')
    expect(css).toContain('html.boot-wordmark svg.boot-splash__wordmark {\n  display: block !important;')
    expect(html).toContain('aria-label="Loading logbook"')
    expect(html).toContain('prefers-reduced-motion: reduce')
    expect(html).toContain('translate(194,405)')
    expect(html).toContain('translate(634,315)')
  })
})
