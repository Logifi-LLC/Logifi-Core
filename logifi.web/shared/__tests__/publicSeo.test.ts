import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  APP_STORE_URL,
  CANONICAL_ORIGIN,
  PUBLIC_MARKETING_PATHS,
  SITEMAP_URL,
  canonicalHrefForPath,
  isVercelAppHost,
  publicCanonicalUrls,
  renderSitemapXml,
  robotsNoindexHeader,
  seoHeadTags,
  shouldEmbedItunesAppMeta,
} from '../publicSeo'

const root = path.resolve(process.cwd())

describe('public marketing pages', () => {
  it('lists the nine public pages and skips app routes', () => {
    expect(PUBLIC_MARKETING_PATHS).toHaveLength(9)
    expect(publicCanonicalUrls()).toEqual([
      `${CANONICAL_ORIGIN}/`,
      `${CANONICAL_ORIGIN}/integrations`,
      `${CANONICAL_ORIGIN}/pricing`,
      `${CANONICAL_ORIGIN}/developers`,
      `${CANONICAL_ORIGIN}/feedback`,
      `${CANONICAL_ORIGIN}/data-sources`,
      `${CANONICAL_ORIGIN}/terms`,
      `${CANONICAL_ORIGIN}/privacy`,
      `${CANONICAL_ORIGIN}/digifi`,
    ])
    for (const appPath of ['/dashboard', '/logbook-builder', '/login', '/reset-password', '/auth/callback', '/digifi-eye', '/digifi-scan']) {
      expect(canonicalHrefForPath(appPath)).toBeNull()
    }
  })

  it('canonicalizes trailing slashes and drops query strings', () => {
    expect(canonicalHrefForPath('/pricing/')).toBe(`${CANONICAL_ORIGIN}/pricing`)
    expect(canonicalHrefForPath('/terms?from=landing')).toBe(`${CANONICAL_ORIGIN}/terms`)
    expect(canonicalHrefForPath('/')).toBe(`${CANONICAL_ORIGIN}/`)
  })
})

describe('sitemap and robots', () => {
  it('serves a static sitemap that matches the public canonicals', () => {
    const xml = renderSitemapXml()
    expect(readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')).toBe(xml)
    for (const loc of publicCanonicalUrls()) expect(xml).toContain(`<loc>${loc}</loc>`)
    expect(xml).not.toContain('/dashboard')
    expect(xml).not.toContain('/logbook-builder')
    expect(xml).not.toContain('/login')
  })

  it('points robots.txt at the www sitemap', () => {
    const robots = readFileSync(path.join(root, 'public/robots.txt'), 'utf8')
    expect(robots).toContain(`Sitemap: ${SITEMAP_URL}`)
  })
})

describe('vercel.app noindex', () => {
  it('noindexes vercel.app hosts and leaves the public site alone', () => {
    expect(isVercelAppHost('logifi-core.vercel.app')).toBe(true)
    expect(isVercelAppHost('logifi-core-git-dev-team.vercel.app')).toBe(true)
    expect(robotsNoindexHeader('logifi-core.vercel.app')).toBe('noindex')
    expect(isVercelAppHost('www.logifi.io')).toBe(false)
    expect(isVercelAppHost('logifi.io')).toBe(false)
    expect(isVercelAppHost('dev.logifi.io')).toBe(false)
    expect(isVercelAppHost('localhost:3000')).toBe(false)
    expect(robotsNoindexHeader('www.logifi.io')).toBeNull()
    expect(robotsNoindexHeader('logifi.io')).toBeNull()
  })

  it('adds a robots meta only for vercel.app HTML', () => {
    const vercel = seoHeadTags({ pathname: '/pricing', hostname: 'logifi-core.vercel.app', embedItunes: true })
    expect(vercel.join('')).toContain('<meta name="robots" content="noindex">')
    expect(vercel.join('')).toContain(`${CANONICAL_ORIGIN}/pricing`)
    const www = seoHeadTags({ pathname: '/pricing', hostname: 'www.logifi.io', embedItunes: true }).join('')
    expect(www).not.toContain('noindex')
    expect(seoHeadTags({ pathname: '/', hostname: 'logifi.io', embedItunes: true }).join('')).not.toContain('noindex')
    expect(seoHeadTags({ pathname: '/dashboard', hostname: 'www.logifi.io', embedItunes: true }).join('')).not.toContain('canonical')
  })

  it('declares the host-conditional X-Robots-Tag for static vercel.app files', () => {
    const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      headers?: Array<{ has?: Array<{ type?: string; value?: string }>; headers?: Array<{ key?: string; value?: string }> }>
    }
    const rule = vercel.headers?.find((entry) =>
      entry.headers?.some((header) => header.key === 'X-Robots-Tag' && header.value === 'noindex')
    )
    expect(rule?.has?.some((condition) => condition.type === 'host' && condition.value?.includes('vercel\\.app'))).toBe(true)
  })
})

describe('app store smart banner', () => {
  it('embeds the itunes tag on website renders and skips the Capacitor static shell', () => {
    expect(shouldEmbedItunesAppMeta({ prerender: false, lifecycleEvent: 'build' })).toBe(true)
    expect(shouldEmbedItunesAppMeta({ prerender: true, lifecycleEvent: 'build', nitroPreset: 'vercel' })).toBe(true)
    expect(shouldEmbedItunesAppMeta({ prerender: true, lifecycleEvent: 'generate', nitroPreset: 'static' })).toBe(false)
    expect(shouldEmbedItunesAppMeta({ prerender: true, lifecycleEvent: 'generate' })).toBe(false)
    const tags = seoHeadTags({ pathname: '/', hostname: 'www.logifi.io', embedItunes: true }).join('')
    expect(tags).toContain('name="apple-itunes-app"')
    expect(tags).toContain('app-id=6786842277')
    expect(seoHeadTags({ pathname: '/', hostname: 'www.logifi.io', embedItunes: false }).join('')).not.toContain('apple-itunes-app')
  })

  it('uses the App Store listing URL', () => {
    expect(APP_STORE_URL).toBe('https://apps.apple.com/us/app/logifi/id6786842277')
  })
})
