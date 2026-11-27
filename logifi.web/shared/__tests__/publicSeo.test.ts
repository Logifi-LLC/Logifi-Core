import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  APP_STORE_URL,
  CANONICAL_ORIGIN,
  DISCORD_INVITE_URL,
  FACEBOOK_PAGE_URL,
  FOUNDER_X_URL,
  GITHUB_REPO_URL,
  HOMEPAGE_JSON_LD_ID,
  INSTAGRAM_URL,
  IOS_APP_APPLICATION_CATEGORY,
  LINKEDIN_COMPANY_URL,
  MARKETING_DARK_BG,
  OG_IMAGE_URL,
  ORGANIZATION_LOGO_URL,
  ORGANIZATION_NAME,
  ORGANIZATION_SAME_AS,
  PUBLIC_MARKETING_PATHS,
  SITEMAP_URL,
  canonicalHrefForPath,
  homepageJsonLdJson,
  homepageStructuredData,
  isVercelAppHost,
  publicCanonicalUrls,
  lastmodForPublicPath,
  renderSitemapXml,
  SITEMAP_MARKETING_COPY_LASTMOD,
  robotsNoindexHeader,
  seoHeadTags,
  shouldEmbedItunesAppMeta,
} from '../publicSeo'

const root = path.resolve(process.cwd())

describe('public marketing pages', () => {
  it('lists the public pages and skips app routes', () => {
    expect(PUBLIC_MARKETING_PATHS).toHaveLength(13)
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
      `${CANONICAL_ORIGIN}/faq`,
      `${CANONICAL_ORIGIN}/how-to-digitize-a-paper-pilot-logbook`,
      `${CANONICAL_ORIGIN}/import-foreflight-logten-logbook`,
      `${CANONICAL_ORIGIN}/airline-pilot-logbook-app`,
    ])
    for (const appPath of ['/dashboard', '/logbook-builder', '/logbook-check', '/login', '/reset-password', '/auth/callback', '/auth/confirm', '/digifi-eye', '/digifi-scan', '/totals-report']) {
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
    for (const loc of publicCanonicalUrls()) {
      expect(xml).toContain(`<loc>${loc}</loc>`)
      const path = loc === `${CANONICAL_ORIGIN}/` ? '/' : loc.replace(CANONICAL_ORIGIN, '')
      expect(xml).toContain(`<lastmod>${lastmodForPublicPath(path)}</lastmod>`)
    }
    expect(lastmodForPublicPath('/faq')).toBe(SITEMAP_MARKETING_COPY_LASTMOD)
    expect(xml).not.toContain('/dashboard')
    expect(xml).not.toContain('/logbook-builder')
    expect(xml).not.toContain('/logbook-check')
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

describe('absolute share image', () => {
  it('points og and twitter images at the canonical origin', () => {
    expect(OG_IMAGE_URL).toBe('https://www.logifi.io/images/og-image.png')
    expect(existsSync(path.join(root, 'public/images/og-image.png'))).toBe(true)
    const config = readFileSync(path.join(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("import { OG_IMAGE_URL } from './shared/publicSeo'")
    expect(config).toContain("property: 'og:image', content: OG_IMAGE_URL")
    expect(config).toContain("name: 'twitter:image', content: OG_IMAGE_URL")
    expect(config).not.toContain("content: '/images/og-image.png'")
  })
})

describe('homepage JSON-LD', () => {
  it('describes Logifi LLC and the free iOS app on the marketing homepage only', () => {
    expect(existsSync(path.join(root, 'public/images/logifi-logo.png'))).toBe(true)
    const home = seoHeadTags({ pathname: '/', hostname: 'www.logifi.io', embedItunes: true }).join('')
    expect(home).toContain(`id="${HOMEPAGE_JSON_LD_ID}"`)
    expect(home).toContain('type="application/ld+json"')
    expect(seoHeadTags({ pathname: '/', hostname: 'logifi-core.vercel.app', embedItunes: false }).join('')).toContain('application/ld+json')
    for (const pathname of ['/pricing', '/pricing/', '/dashboard', '/login', '/index.html']) {
      expect(homepageStructuredData(pathname)).toBeNull()
      expect(seoHeadTags({ pathname, hostname: 'www.logifi.io', embedItunes: true }).join('')).not.toContain('application/ld+json')
    }

    const data = homepageStructuredData('/') as {
      '@graph': Array<Record<string, unknown>>
    }
    expect(JSON.parse(homepageJsonLdJson('/')!)).toEqual(data)
    const [org, app] = data['@graph']
    expect(org).toEqual({
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      url: CANONICAL_ORIGIN,
      logo: ORGANIZATION_LOGO_URL,
      sameAs: [...ORGANIZATION_SAME_AS],
    })
    expect(ORGANIZATION_NAME).toBe('Logifi LLC')
    expect(ORGANIZATION_LOGO_URL).toBe('https://www.logifi.io/images/logifi-logo.png')
    expect(ORGANIZATION_SAME_AS).toEqual([
      GITHUB_REPO_URL,
      DISCORD_INVITE_URL,
      LINKEDIN_COMPANY_URL,
      FACEBOOK_PAGE_URL,
      INSTAGRAM_URL,
      APP_STORE_URL,
    ])
    expect(ORGANIZATION_SAME_AS).not.toContain(FOUNDER_X_URL)
    expect(app).toEqual({
      '@type': 'MobileApplication',
      name: 'Logifi',
      operatingSystem: 'iOS',
      applicationCategory: IOS_APP_APPLICATION_CATEGORY,
      url: APP_STORE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    })
    expect(IOS_APP_APPLICATION_CATEGORY).toBe('UtilitiesApplication')
    const serialized = JSON.stringify(data)
    expect(serialized).not.toMatch(/aggregateRating|reviewCount|ratingValue/i)
    expect(home).not.toContain('</script><')
  })
})

describe('env.example product keys', () => {
  it('lists Apple and Digifi settings the server reads', () => {
    const example = readFileSync(path.join(root, 'env.example'), 'utf8')
    for (const key of [
      'NUXT_PUBLIC_APPLE_WEB_SIGNIN',
      'APPLE_BUNDLE_ID',
      'APPLE_IAP_ENVIRONMENT',
      'APPLE_APP_ID',
      'NUXT_DIGIFI_GEMINI_MEDIA_RESOLUTION',
      'NUXT_DIGIFI_SEND_ROW_BANDS',
      'NUXT_DEV_PORT',
    ]) {
      expect(example).toContain(key)
    }
    expect(example).not.toMatch(/sk_live_|whsec_[A-Za-z0-9]{8,}|re_[A-Za-z0-9]{8,}/)
  })
})

describe('llms.txt', () => {
  it('ships crawler guidance at /llms.txt', () => {
    const llms = readFileSync(path.join(root, 'public/llms.txt'), 'utf8')
    expect(llms).toContain('10 pages free, then 50 cents a page')
    expect(llms).not.toMatch(/\bspreads?\b/i)
    expect(llms).not.toContain('70%')
  })
})

describe('marketing links', () => {
  it('exposes public social and support URLs', () => {
    expect(MARKETING_DARK_BG).toBe('#0a0e1a')
    expect(GITHUB_REPO_URL).toBe('https://github.com/Logifi-LLC/Logifi-Core')
    expect(DISCORD_INVITE_URL).toBe('https://discord.gg/hBaDkNt2ev')
  })
})
