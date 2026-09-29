import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isKnownAppPath, isPassthroughDocumentPath } from '../spaDocumentStatus'

const pagesDir = path.resolve(process.cwd(), 'app/pages')

function pageFiles(dir: string, prefix = ''): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    if (statSync(full).isDirectory()) files.push(...pageFiles(full, rel))
    else if (entry.endsWith('.vue')) files.push(rel)
  }
  return files
}

/** A real URL the client router would open for this page file. */
function samplePath(rel: string): string | null {
  if (rel.includes('[...')) return null
  const parts = rel.replace(/\.vue$/, '').split('/')
  const urlParts = parts.map((part) => {
    if (part === 'index') return ''
    if (part.startsWith('[') && part.endsWith(']')) return 'sample-token'
    return part
  })
  const url = `/${urlParts.filter(Boolean).join('/')}`
  return url === '/' ? '/' : url
}

describe('spa document status', () => {
  it('keeps every file page as a known document route', () => {
    const files = pageFiles(pagesDir)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const sample = samplePath(file)
      if (!sample) {
        expect(file).toContain('[...')
        continue
      }
      expect(isKnownAppPath(sample), file).toBe(true)
    }
  })

  it('returns 200-class paths for deep links and auth', () => {
    expect(isKnownAppPath('/')).toBe(true)
    expect(isKnownAppPath('/digifi/')).toBe(true)
    expect(isKnownAppPath('/dashboard')).toBe(true)
    expect(isKnownAppPath('/auth/callback')).toBe(true)
    expect(isKnownAppPath('/digifi-capture/abc')).toBe(true)
    expect(isKnownAppPath('/guest-sign/abc')).toBe(true)
  })

  it('marks unknown documents as not an app path', () => {
    expect(isKnownAppPath('/does-not-exist')).toBe(false)
    expect(isKnownAppPath('/digifi/extra')).toBe(false)
    expect(isKnownAppPath('/digifi-capture')).toBe(false)
    expect(isKnownAppPath('/guest-sign')).toBe(false)
  })

  it('does not re-status API or asset requests', () => {
    expect(isPassthroughDocumentPath('/api/credits/balance')).toBe(true)
    expect(isPassthroughDocumentPath('/_nuxt/entry.js')).toBe(true)
    expect(isPassthroughDocumentPath('/images/logifi-logo.png')).toBe(true)
    expect(isPassthroughDocumentPath('/robots.txt')).toBe(true)
    expect(isPassthroughDocumentPath('/does-not-exist')).toBe(false)
    expect(isPassthroughDocumentPath('/digifi')).toBe(false)
  })
})