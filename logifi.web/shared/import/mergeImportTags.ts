/** Union of existing + incoming tags, trimmed and de-duplicated in first-seen order. */
export function mergeIncomingTags(
  existing: string[] | undefined,
  incoming: string[] | undefined
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of [...(existing ?? []), ...(incoming ?? [])]) {
    const tag = typeof raw === 'string' ? raw.trim() : ''
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

/** True when incoming has at least one tag the existing entry does not. */
export function incomingTagsAddToExisting(
  existing: string[] | undefined,
  incoming: string[] | undefined
): boolean {
  return mergeIncomingTags(existing, incoming).length > (existing ?? []).filter(Boolean).length
}
