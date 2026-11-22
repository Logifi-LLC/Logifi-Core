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
  return tags
}

export function renderSitemapXml(): string {
  const urls = publicCanonicalUrls().map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
