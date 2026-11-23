/** Public marketing pages. App routes (login, logbook, builder) stay out. */
export const PUBLIC_MARKETING_PATHS = [
  '/',
  '/integrations',
  '/pricing',
  '/developers',
  '/feedback',
  '/data-sources',
  '/terms',
  '/privacy',
  '/digifi',
  '/faq',
  '/how-to-digitize-a-paper-pilot-logbook',
  '/import-foreflight-logten-logbook',
  '/airline-pilot-logbook-app',
] as const

export const CANONICAL_ORIGIN = 'https://www.logifi.io'
export const APP_STORE_URL = 'https://apps.apple.com/us/app/logifi/id6786842277'
export const APP_STORE_APP_ID = '6786842277'

/** Share image. Absolute so crawlers do not resolve it against a preview host. */
export const OG_IMAGE_URL = `${CANONICAL_ORIGIN}/images/og-image.png`

/** Mark already used in the marketing header and footer. */
export const ORGANIZATION_LOGO_URL = `${CANONICAL_ORIGIN}/images/logifi-logo.png`

/** Privacy policy: "Logifi is operated by Logifi LLC." */
export const ORGANIZATION_NAME = 'Logifi LLC'

/**
 * Schema.org software type for the free logbook app.
 * The repo does not record an App Store category string.
 */
export const IOS_APP_APPLICATION_CATEGORY = 'UtilitiesApplication'

export const HOMEPAGE_JSON_LD_ID = 'logifi-homepage-jsonld'

/** Dark marketing shell background (footer, landing pages). */
export const MARKETING_DARK_BG = '#0a0e1a'

export const GITHUB_REPO_URL = 'https://github.com/Logifi-LLC/Logifi-Core'
export const DISCORD_INVITE_URL = 'https://discord.gg/hBaDkNt2ev'
export const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/143944083/'
export const FACEBOOK_PAGE_URL =
  'https://www.facebook.com/people/Logifiio/61594164595062/'
export const INSTAGRAM_URL = 'https://www.instagram.com/logifi.io/'
export const FOUNDER_X_URL = 'https://x.com/derekfarm'
export const SUPPORT_EMAIL = 'info@logifi.io'

/** Company profiles from the marketing footer, plus the App Store listing in that footer. */
export const ORGANIZATION_SAME_AS = [
  GITHUB_REPO_URL,
  DISCORD_INVITE_URL,
  LINKEDIN_COMPANY_URL,
  FACEBOOK_PAGE_URL,
  INSTAGRAM_URL,
  APP_STORE_URL,
] as const
export const SITEMAP_URL = `${CANONICAL_ORIGIN}/sitemap.xml`
export const ROBOTS_NOINDEX = 'noindex'

const PUBLIC_PATH_SET = new Set<string>(PUBLIC_MARKETING_PATHS)

export function hostnameFromHostHeader(host: string | null | undefined): string {
  if (!host) return ''
  const first = host.split(',')[0]?.trim().toLowerCase() ?? ''
  if (!first || first.startsWith('[')) return first
  return first.replace(/:\d+$/, '')
}

/** True for deployment hosts such as logifi-core.vercel.app. Not logifi.io. */
export function isVercelAppHost(host: string | null | undefined): boolean {
  const hostname = hostnameFromHostHeader(host)
  return hostname.endsWith('.vercel.app')
}

export function robotsNoindexHeader(host: string | null | undefined): string | null {
  return isVercelAppHost(host) ? ROBOTS_NOINDEX : null
}

export function normalizePublicPath(pathname: string): string {
  const path = pathname.split('?')[0]?.split('#')[0] || '/'
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

export function canonicalHrefForPath(pathname: string): string | null {
  const path = normalizePublicPath(pathname)
  if (!PUBLIC_PATH_SET.has(path)) return null
  return path === '/' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${path}`
}

export function publicCanonicalUrls(): string[] {
  return PUBLIC_MARKETING_PATHS.map((path) => {
    const href = canonicalHrefForPath(path)
    if (!href) throw new Error(`Missing canonical for ${path}`)
    return href
  })
}

/**
 * `nuxt generate` writes the shell Capacitor ships. Leave the smart banner
 * out of that shell. Website builds and live responses still get the tag;
 * the native WebView removes it when Capacitor.isNativePlatform() is true.
 */
export function shouldEmbedItunesAppMeta(options?: {
  prerender?: boolean
  lifecycleEvent?: string
  nitroPreset?: string
}): boolean {
  if (!options?.prerender) return true
  const lifecycle = options.lifecycleEvent ?? ''
  const preset = options.nitroPreset ?? ''
  if (lifecycle === 'generate' || preset === 'static') return false
  return true
}

/** Organization + iOS app facts already published on the marketing site. Homepage only. */
export function homepageStructuredData(pathname: string): Record<string, unknown> | null {
  if (normalizePublicPath(pathname) !== '/') return null
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: ORGANIZATION_NAME,
        url: CANONICAL_ORIGIN,
        logo: ORGANIZATION_LOGO_URL,
        sameAs: [...ORGANIZATION_SAME_AS],
      },
      {
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
      },
    ],
  }
}

export function homepageJsonLdJson(pathname: string): string | null {
  const data = homepageStructuredData(pathname)
  if (!data) return null
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function homepageJsonLdScript(pathname: string): string | null {
  const json = homepageJsonLdJson(pathname)
  if (!json) return null
  return `<script type="application/ld+json" id="${HOMEPAGE_JSON_LD_ID}">${json}</script>`
}

export function seoHeadTags(input: {
  pathname: string
  hostname?: string | null
  embedItunes?: boolean
}): string[] {
  const tags: string[] = []
  const canonical = canonicalHrefForPath(input.pathname)
  if (canonical) tags.push(`<link rel="canonical" href="${canonical}">`)
  if (input.embedItunes) {
    tags.push(`<meta name="apple-itunes-app" content="app-id=${APP_STORE_APP_ID}">`)
  }
  if (isVercelAppHost(input.hostname)) {
    tags.push('<meta name="robots" content="noindex">')
  }
  const jsonLd = homepageJsonLdScript(input.pathname)
  if (jsonLd) tags.push(jsonLd)
  return tags
}

export function renderSitemapXml(): string {
  const urls = publicCanonicalUrls().map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
