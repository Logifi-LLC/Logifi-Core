import type { LogEntry } from './logbookTypes'

/** Entry that amends (supersedes) the given original id, if any. */
export function getAmendmentFor(
  entryId: string,
  entries: readonly LogEntry[]
): LogEntry | undefined {
  return entries.find((e) => e.amendsEntryId === entryId)
}

/** True when another entry in the logbook amends this one. */
export function isEntrySuperseded(
  entryId: string,
  entries: readonly LogEntry[]
): boolean {
  return entries.some((e) => e.amendsEntryId === entryId)
}

/** Original entry that this amendment replaces, if linked. */
export function getAmendedOriginal(
  entry: Pick<LogEntry, 'amendsEntryId'>,
  entries: readonly LogEntry[]
): LogEntry | undefined {
  if (!entry.amendsEntryId) return undefined
  return entries.find((e) => e.id === entry.amendsEntryId)
}

export function formatAmendsLabel(original: LogEntry): string {
  const date = (original.date || '').toString().slice(0, 10)
  const route = `${original.departure || '—'} → ${original.destination || '—'}`
  return date ? `${date} · ${route}` : route
}
