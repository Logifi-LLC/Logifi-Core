import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MARKETING_PAGE_SOURCES } from '../marketingPagesContent'
import {
  blockPlainLines,
  escapeHtml,
  getMarketingPage,
  MARKETING_ARTICLE_DATE,
  MARKETING_COPY_PAGES,
  parseBlocks,
  patchMarketingBody,
  patchMarketingHead,
  patchShellMarketingHead,
  renderCrawlableHtml,
  safeLink,
  type Block,
} from '../marketingPages'
import { canonicalHrefForPath, PUBLIC_MARKETING_PATHS } from '../publicSeo'

const root = path.resolve(process.cwd())

function markdownPlainLines(markdown: string): string[] {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,3}\s+/, '')
        .replace(/^-\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim(),
    )
    .filter(Boolean)
}

function answerFromBlocks(blocks: Block[], name: string): string {
  const parts: string[] = []
  let on = false
  for (const block of blocks) {
    if (block.type === 'h2') {
      if (on) break
      on = block.text === name
      continue
    }
    if (!on || block.type === 'h1') continue
    if (block.type === 'p') parts.push(block.inlines.map((part) => part.text).join(''))
    else for (const item of block.items) parts.push(item.map((part) => part.text).join(''))
  }
  return parts.join(' ')
}

function htmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

const SHELL_HEAD = [
  '<title>Logifi — Digital Pilot Logbooks</title>',
  '<meta name="description" content="Free, FAA-compliant digital pilot logbooks.">',
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="Logifi — Digital Pilot Logbooks">',
  '<meta property="og:description" content="Free, FAA-compliant digital pilot logbooks.">',
  '<meta name="twitter:title" content="Logifi — Digital Pilot Logbooks">',
  '<meta name="twitter:description" content="Free, FAA-compliant digital pilot logbooks.">',
].join('')

describe('marketing copy pages', () => {
  it('keeps the published wording and drops draft notes', () => {
    expect(MARKETING_COPY_PAGES.map((page) => page.path)).toEqual([
      '/faq',
      '/how-to-digitize-a-paper-pilot-logbook',
      '/import-foreflight-logten-logbook',
      '/airline-pilot-logbook-app',
    ])
    for (const source of MARKETING_PAGE_SOURCES) {
      const page = getMarketingPage(source.path)
      expect(page).not.toBeNull()
      expect(blockPlainLines(parseBlocks(source.markdown))).toEqual(markdownPlainLines(source.markdown))
      const published = `${source.title}\n${source.description}\n${source.markdown}`
      expect(published).not.toContain('Reviewer notes')
      expect(published).not.toContain('Draft for review')
      expect(published).not.toContain('for this draft')
      expect(published).not.toContain('Suggested title tag')
      expect(published).not.toContain('70%')
      expect(published.toLowerCase()).not.toContain('self-host')
      expect(published.toLowerCase()).not.toContain('you own your data')
      expect(published.toLowerCase()).not.toContain('who owns my logbook')
      expect(published.toLowerCase()).not.toContain('you own your logbook data')
      expect(PUBLIC_MARKETING_PATHS).toContain(source.path)
      expect(canonicalHrefForPath(source.path)).toBe(page?.canonical)
    }
  })

  it('builds FAQPage JSON-LD from the same answers as the page', () => {
    const faq = getMarketingPage('/faq')
    expect(faq?.kind).toBe('faq')
    const entity = faq?.jsonLd.mainEntity
    expect(Array.isArray(entity)).toBe(true)
    const questions = entity as Array<{ name: string; acceptedAnswer: { text: string } }>
    expect(questions).toHaveLength(12)
    expect(questions.map((question) => question.name)).toEqual(
      faq?.blocks.filter((block) => block.type === 'h2').map((block) => block.text),
    )
    for (const question of questions) {
      expect(question.acceptedAnswer.text).toBe(answerFromBlocks(faq?.blocks ?? [], question.name))
      expect(question.acceptedAnswer.text).not.toContain('---')
    }
    const digifi = questions.find((question) => question.name === 'What is Digifi?')
    expect(digifi?.acceptedAnswer.text).toContain('gets to know your logbook')
    expect(digifi?.acceptedAnswer.text).toContain('10 free pages')
    expect(digifi?.acceptedAnswer.text).not.toContain('70%')
    const help = questions.find((question) => question.name === 'How do I get help?')
    expect(help?.acceptedAnswer.text.endsWith('export.')).toBe(true)
    expect(faq?.jsonLd).not.toHaveProperty('datePublished')
    expect(JSON.stringify(faq?.jsonLd)).not.toContain('Derek Farmer')
  })

  it('adds Article JSON-LD without an author name the copy does not use', () => {
    for (const page of MARKETING_COPY_PAGES.filter((item) => item.kind === 'article')) {
      const headline = page.blocks.find((block) => block.type === 'h1')
      expect(page.jsonLd).toMatchObject({
        '@type': 'Article',
        headline: headline && headline.type === 'h1' ? headline.text : '',
        description: page.description,
        datePublished: MARKETING_ARTICLE_DATE,
        publisher: { '@type': 'Organization', name: 'Logifi' },
      })
      expect(page.jsonLd).not.toHaveProperty('author')
      expect(page.jsonLd).not.toHaveProperty('aggregateRating')
      expect(JSON.stringify(page.jsonLd)).not.toContain('Derek Farmer')
    }
    expect(MARKETING_ARTICLE_DATE).toBe('2026-11-21')
  })

  it('escapes crawlable HTML and drops unsafe links', () => {
    const hostile = renderCrawlableHtml([
      {
        type: 'p',
        inlines: [
          { type: 'text', text: '<script>alert(1)</script>' },
          { type: 'link', text: 'bad', href: 'javascript:alert(1)' },
          { type: 'link', text: 'site', href: 'https://www.logifi.io/pricing' },
          { type: 'link', text: 'store', href: 'https://apps.apple.com/us/app/logifi/id6786842277' },
        ],
      },
    ])
    expect(hostile).toContain(escapeHtml('<script>alert(1)</script>'))
    expect(hostile).not.toContain('<script>alert')
    expect(hostile).not.toContain('javascript:')
    expect(hostile).toContain('href="/pricing"')
    expect(hostile).toContain('rel="noopener noreferrer"')
    expect(safeLink('https://www.logifi.io//evil.example')).toBeNull()
    expect(safeLink('https://evil.example')).toEqual({ href: 'https://evil.example', external: true })
  })

  it('puts the page title, description, and body into the document shell', () => {
    const head = patchMarketingHead(SHELL_HEAD, '/faq/')
    expect(head).toContain('<title>Logifi FAQ: Free Logbook, Digifi, Imports</title>')
    expect(head).not.toContain('Digital Pilot Logbooks')
    expect(head).toContain('Is Logifi free? How Digifi credits work')
    expect(head).toContain('property="og:url" content="https://www.logifi.io/faq"')
    expect(head).toContain('property="og:type" content="website"')
    expect(head).toContain('application/ld+json')
    expect(head).toContain('FAQPage')
    const articleHead = patchMarketingHead(SHELL_HEAD, '/airline-pilot-logbook-app')
    expect(articleHead).toContain('property="og:type" content="article"')
    expect(articleHead).toContain('"datePublished":"2026-11-21"')
    expect(patchMarketingHead(SHELL_HEAD, '/pricing')).toBeNull()
    const pricingHead = patchShellMarketingHead(SHELL_HEAD, '/pricing')
    expect(pricingHead).toContain('<title>Pricing | Logifi</title>')
    expect(pricingHead).toContain('10 pages free, then $0.50 per page')

    const body = patchMarketingBody('<div id="__nuxt"></div>', '/faq')
    expect(body).toContain('id="marketing-copy"')
    expect(body).toContain('id="marketing-guides-footer"')
    expect(body).toContain('href="/how-to-digitize-a-paper-pilot-logbook"')
    expect(body).toContain('Is Logifi free?')
    expect(htmlText(body)).toContain('gets to know your logbook')
    expect(patchMarketingBody(body, '/faq')).toBe(body)
    expect(patchMarketingBody('<div id="__nuxt"></div>', '/pricing')).toBe('<div id="__nuxt"></div>')
  })

  it('removes the Digifi 70% accuracy sentence from the public page', () => {
    const digifi = readFileSync(path.join(root, 'app/pages/digifi.vue'), 'utf8')
    expect(digifi).not.toContain('70%')
    expect(digifi.toLowerCase()).not.toContain('self-host')
    expect(digifi).toContain('Digifi extracts flight entries from the photos.')
  })
})
