/**
 * Public FAQ and article pages. Copy lives in marketingPagesContent.ts.
 * Vue renders the blocks as elements. The document hook uses the same blocks
 * for the crawlable HTML and JSON-LD in the first response.
 */
import { CANONICAL_ORIGIN, MARKETING_SHELL_SEO, normalizePublicPath } from './publicSeo'
import { MARKETING_PAGE_SOURCES } from './marketingPagesContent'

export const MARKETING_ARTICLE_DATE = '2026-11-21'

export type MarketingCopyActivePage =
  | 'faq'
  | 'digitize-logbook'
  | 'import-logbook'
  | 'airline-logbook'

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string }

export type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'p'; inlines: Inline[] }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'ol'; items: Inline[][] }

export type MarketingPage = {
  path: string
  title: string
  description: string
  kind: 'faq' | 'article'
  activePage: MarketingCopyActivePage
  canonical: string
  blocks: Block[]
  jsonLd: Record<string, unknown>
}

const ACTIVE_PAGE: Record<string, MarketingCopyActivePage> = {
  '/faq': 'faq',
  '/how-to-digitize-a-paper-pilot-logbook': 'digitize-logbook',
  '/import-foreflight-logten-logbook': 'import-logbook',
  '/airline-pilot-logbook-app': 'airline-logbook',
}

const INLINE_RE =
  /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|(https?:\/\/[^\s<]+)/g

export function parseInlines(input: string): Inline[] {
  const inlines: Inline[] = []
  const re = new RegExp(INLINE_RE.source, 'g')
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(input))) {
    if (match.index > last) inlines.push({ type: 'text', text: input.slice(last, match.index) })
    if (match[1] != null) inlines.push({ type: 'strong', text: match[1] })
    else if (match[2] != null && match[3] != null) inlines.push({ type: 'link', text: match[2], href: match[3] })
    else if (match[4] != null) inlines.push({ type: 'code', text: match[4] })
    else if (match[5] != null) inlines.push({ type: 'link', text: match[5], href: match[5] })
    last = match.index + match[0].length
  }
  if (last < input.length) inlines.push({ type: 'text', text: input.slice(last) })
  return inlines
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.trim()) {
      i += 1
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      i += 1
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
      i += 1
      continue
    }
    if (line.startsWith('- ')) {
      const items: Inline[][] = []
      while (i < lines.length && (lines[i] ?? '').startsWith('- ')) {
        items.push(parseInlines((lines[i] ?? '').slice(2).trim()))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push(parseInlines((lines[i] ?? '').replace(/^\d+\.\s+/, '').trim()))
        i += 1
      }
      blocks.push({ type: 'ol', items })
      continue
    }
    const paragraph: string[] = []
    while (i < lines.length) {
      const current = lines[i] ?? ''
      if (
        !current.trim() ||
        current.startsWith('#') ||
        current.startsWith('- ') ||
        /^\d+\.\s+/.test(current)
      ) {
        break
      }
      paragraph.push(current.trim())
      i += 1
    }
    const inlines = parseInlines(paragraph.join(' '))
    if (inlines.length) blocks.push({ type: 'p', inlines })
  }
  return blocks
}

export function inlineText(inlines: Inline[]): string {
  return inlines.map((part) => part.text).join('')
}

export function blockPlainLines(blocks: Block[]): string[] {
  const lines: string[] = []
  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2') lines.push(block.text)
    else if (block.type === 'p') lines.push(inlineText(block.inlines))
    else for (const item of block.items) lines.push(inlineText(item))
  }
  return lines
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** https links only. Same-site URLs become a single-slash path. */
export function safeLink(href: string): { href: string; external: boolean } | null {
  if (!href || href.startsWith('//') || /[\s"'<>]/.test(href)) return null
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (url.protocol === 'https:' && (host === 'www.logifi.io' || host === 'logifi.io')) {
    const path = `${url.pathname}${url.search}${url.hash}` || '/'
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null
    return { href: path, external: false }
  }
  if (url.protocol === 'https:' && /^https:\/\/\S+$/.test(href)) return { href, external: true }
  return null
}

function renderInlines(inlines: Inline[]): string {
  return inlines
    .map((part) => {
      const text = escapeHtml(part.text)
      if (part.type === 'strong') return `<strong>${text}</strong>`
      if (part.type === 'code') return `<code>${text}</code>`
      if (part.type === 'link') {
        const link = safeLink(part.href)
        if (!link) return text
        const href = escapeHtml(link.href)
        if (link.external) {
          return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
        }
        return `<a href="${href}">${text}</a>`
      }
      return text
    })
    .join('')
}

export function renderCrawlableHtml(blocks: Block[]): string {
  const html = blocks
    .map((block) => {
      if (block.type === 'h1') return `<h1>${escapeHtml(block.text)}</h1>`
      if (block.type === 'h2') return `<h2>${escapeHtml(block.text)}</h2>`
      if (block.type === 'p') return `<p>${renderInlines(block.inlines)}</p>`
      const tag = block.type === 'ol' ? 'ol' : 'ul'
      const items = block.items.map((item) => `<li>${renderInlines(item)}</li>`).join('')
      return `<${tag}>${items}</${tag}>`
    })
    .join('')
  return `<article id="marketing-copy">${html}</article>`
}

const CRAWLABLE_GUIDE_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/how-to-digitize-a-paper-pilot-logbook', label: 'Digitize a paper logbook' },
  { href: '/import-foreflight-logten-logbook', label: 'Import ForeFlight or LogTen' },
  { href: '/airline-pilot-logbook-app', label: 'Airline pilot logbook' },
] as const

/** Guides row for prerendered marketing copy pages (ssr:false shell). */
export function renderCrawlableGuidesFooter(): string {
  const links = CRAWLABLE_GUIDE_LINKS.map(
    (item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`,
  ).join(' · ')
  return `<nav id="marketing-guides-footer" aria-label="Guides">${links}</nav>`
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

function answerText(parts: string[]): string {
  return parts.join(' ')
}

function faqJsonLd(blocks: Block[]): Record<string, unknown> {
  const mainEntity: Array<Record<string, unknown>> = []
  let current: { name: string; parts: string[] } | null = null
  const push = () => {
    if (!current) return
    mainEntity.push({
      '@type': 'Question',
      name: current.name,
      acceptedAnswer: { '@type': 'Answer', text: answerText(current.parts) },
    })
  }
  for (const block of blocks) {
    if (block.type === 'h2') {
      push()
      current = { name: block.text, parts: [] }
      continue
    }
    if (!current || block.type === 'h1') continue
    if (block.type === 'p') current.parts.push(inlineText(block.inlines))
    else for (const item of block.items) current.parts.push(inlineText(item))
  }
  push()
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }
}

function articleJsonLd(headline: string, description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    datePublished: MARKETING_ARTICLE_DATE,
    publisher: { '@type': 'Organization', name: 'Logifi' },
  }
}

function buildPage(source: (typeof MARKETING_PAGE_SOURCES)[number]): MarketingPage {
  const blocks = parseBlocks(source.markdown)
  const headline = blocks.find((block) => block.type === 'h1')
  const activePage = ACTIVE_PAGE[source.path]
  if (!activePage) throw new Error(`Missing footer id for ${source.path}`)
  if (!headline || headline.type !== 'h1') throw new Error(`Missing h1 for ${source.path}`)
  return {
    path: source.path,
    title: source.title,
    description: source.description,
    kind: source.kind,
    activePage,
    canonical: `${CANONICAL_ORIGIN}${source.path}`,
    blocks,
    jsonLd:
      source.kind === 'faq'
        ? faqJsonLd(blocks)
        : articleJsonLd(headline.text, source.description),
  }
}

export const MARKETING_COPY_PAGES: MarketingPage[] = MARKETING_PAGE_SOURCES.map(buildPage)

const PAGE_BY_PATH = new Map(MARKETING_COPY_PAGES.map((page) => [page.path, page]))

export function getMarketingPage(pathname: string): MarketingPage | null {
  return PAGE_BY_PATH.get(normalizePublicPath(pathname)) ?? null
}

function replaceOrAppendMeta(
  html: string,
  attr: 'name' | 'property',
  key: string,
  value: string,
): string {
  const content = escapeHtml(value)
  const tag = `<meta ${attr}="${key}" content="${content}">`
  const patterns = [
    new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`),
    new RegExp(`<meta content="[^"]*" ${attr}="${key}"\\s*/?>`),
  ]
  for (const pattern of patterns) {
    if (pattern.test(html)) return html.replace(pattern, tag)
  }
  return html + tag
}

function patchMarketingMetaHead(
  headHtml: string,
  meta: { title: string; description: string; ogType?: string; ogUrl?: string; jsonLd?: Record<string, unknown> },
): string {
  let html = headHtml
  const title = escapeHtml(meta.title)
  if (/<title>[^<]*<\/title>/.test(html)) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  } else {
    html += `<title>${title}</title>`
  }
  html = replaceOrAppendMeta(html, 'name', 'description', meta.description)
  html = replaceOrAppendMeta(html, 'property', 'og:title', meta.title)
  html = replaceOrAppendMeta(html, 'property', 'og:description', meta.description)
  if (meta.ogType) html = replaceOrAppendMeta(html, 'property', 'og:type', meta.ogType)
  if (meta.ogUrl) html = replaceOrAppendMeta(html, 'property', 'og:url', meta.ogUrl)
  html = replaceOrAppendMeta(html, 'name', 'twitter:title', meta.title)
  html = replaceOrAppendMeta(html, 'name', 'twitter:description', meta.description)
  if (meta.jsonLd && !html.includes('id="marketing-jsonld"')) {
    html += `<script type="application/ld+json" id="marketing-jsonld">${serializeJsonLd(meta.jsonLd)}</script>`
  }
  return html
}

export function patchMarketingHead(headHtml: string, pathname: string): string | null {
  const page = getMarketingPage(pathname)
  if (!page) return null
  return patchMarketingMetaHead(headHtml, {
    title: page.title,
    description: page.description,
    ogType: page.kind === 'article' ? 'article' : 'website',
    ogUrl: page.canonical,
    jsonLd: page.jsonLd,
  })
}

export function patchShellMarketingHead(headHtml: string, pathname: string): string | null {
  const path = normalizePublicPath(pathname)
  const shell = MARKETING_SHELL_SEO[path]
  if (!shell) return null
  const canonical = path === '/' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${path}`
  return patchMarketingMetaHead(headHtml, {
    title: shell.title,
    description: shell.description,
    ogType: 'website',
    ogUrl: canonical,
  })
}

export function patchMarketingBody(bodyHtml: string, pathname: string): string {
  const page = getMarketingPage(pathname)
  if (!page || bodyHtml.includes('id="marketing-copy"')) return bodyHtml
  const crawlable = `${renderCrawlableHtml(page.blocks)}${renderCrawlableGuidesFooter()}`
  return bodyHtml.replace(
    /<div id="__nuxt"([^>]*)>\s*<\/div>/,
    (_match, attrs: string) => `<div id="__nuxt"${attrs}>${crawlable}</div>`,
  )
}
