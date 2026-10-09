const SCRIPT_OPEN_RE = /<script\b([^>]*)>/gi

function isApplicationJsonScript(attrs: string): boolean {
  return /\btype\s*=\s*["']application\/json["']/i.test(attrs)
}

function withHiddenAttrs(attrs: string): string {
  let next = attrs
  if (!/\bhidden\b/i.test(next)) next += ' hidden'
  if (!/\bstyle\s*=/.test(next)) next += ' style="display:none"'
  return next
}

/**
 * The real closer is the `</script>` that ends the tag, not one embedded in JSON.
 * A closer is real when nothing follows it, or the next markup is another tag.
 */
function findScriptClose(html: string, from: number): number {
  const lower = html.toLowerCase()
  let i = from
  while (i < html.length) {
    const idx = lower.indexOf('</script>', i)
    if (idx < 0) return -1
    const trimmed = html.slice(idx + '</script>'.length).trimStart()
    if (trimmed.length === 0 || /^<\/?[a-z!]/i.test(trimmed)) return idx
    i = idx + 1
  }
  return -1
}

/**
 * Nuxt's static shell inlines `__NUXT_DATA__` as `<script type="application/json">`.
 * Mark it hidden and escape `<` so a `</script>` inside the JSON cannot spill text
 * onto the page. JSON.parse still yields the original characters.
 */
export function hideApplicationJsonScripts(html: string): string {
  let out = ''
  let cursor = 0
  for (const match of html.matchAll(SCRIPT_OPEN_RE)) {
    const start = match.index ?? 0
    if (start < cursor) continue
    const attrs = match[1] ?? ''
    if (!isApplicationJsonScript(attrs)) continue
    const openEnd = start + match[0].length
    const closeAt = findScriptClose(html, openEnd)
    if (closeAt < 0) continue
    const body = html.slice(openEnd, closeAt).replaceAll('<', '\\u003C')
    out += html.slice(cursor, start)
    out += `<script${withHiddenAttrs(attrs)}>${body}</script>`
    cursor = closeAt + '</script>'.length
  }
  out += html.slice(cursor)
  return out
}
