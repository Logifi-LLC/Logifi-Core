import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

/**
 * The scan prompt lists Pilots even though that column is not on the paper page.
 * The model then copies remarks handwriting into Pilots and leaves it out of Remarks.
 * Put the extracted text back into Remarks, and fill Pilots only from a catalog name.
 */

function collapseSpace(value: string): string {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}

/** Case-insensitive tokens. Commas separate "Last, First" but do not join across "|". */
function looseTokens(value: string): string[] {
  return collapseSpace(value)
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function containsContiguous(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    let matched = true
    for (let offset = 0; offset < needle.length; offset++) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false
        break
      }
    }
    if (matched) return true
  }
  return false
}

/** "Last, First [Middle]" → First [Middle] Last. Other text stays in written order. */
export function canonicalPilotNameTokens(value: string): string[] {
  const trimmed = collapseSpace(value)
  const comma = trimmed.indexOf(',')
  if (comma >= 0) {
    const last = looseTokens(trimmed.slice(0, comma))
    const given = looseTokens(trimmed.slice(comma + 1))
    if (last.length > 0 && given.length > 0) return [...given, ...last]
  }
  return looseTokens(trimmed)
}

/**
 * Remarks windows: written order, plus a leading "Last, First ..." flipped to First Last
 * so lesson words after the name stay after it.
 */
function remarksTokenWindows(remarks: string): string[][] {
  const trimmed = collapseSpace(remarks)
  const windows: string[][] = []
  const plain = looseTokens(trimmed)
  if (plain.length > 0) windows.push(plain)

  const comma = trimmed.indexOf(',')
  if (comma < 0) return windows
  const last = looseTokens(trimmed.slice(0, comma))
  const after = looseTokens(trimmed.slice(comma + 1))
  if (last.length === 0 || after.length === 0) return windows

  const given = [after[0]!]
  const rest = after.slice(1)
  windows.push([...given, ...last, ...rest])
  if (after.length > 1) windows.push([...after, ...last])
  return windows
}

function catalogKey(tokens: readonly string[]): string {
  return tokens.join('\u0000')
}

function preferCatalogSpelling(forms: readonly string[]): string {
  const collapsed = forms.map((form) => collapseSpace(form)).filter(Boolean)
  const direct = collapsed.find((form) => !form.includes(','))
  return direct ?? collapsed[0] ?? ''
}

/**
 * Unique saved-pilot name found as a whole name in remarks, spelled as in the catalog.
 * Case-insensitive. Extra spaces and "Last, First" vs "First Last" are the same name.
 * More than one distinct catalog name → null. No partial or fuzzy token matches.
 */
export function matchCatalogPilotInRemarks(
  remarks: string,
  catalog: readonly string[]
): string | null {
  const windows = remarksTokenWindows(remarks)
  if (windows.length === 0) return null

  const formsByKey = new Map<string, string[]>()
  for (const name of catalog) {
    const tokens = canonicalPilotNameTokens(name)
    if (tokens.length === 0) continue
    const key = catalogKey(tokens)
    const forms = formsByKey.get(key)
    if (forms) forms.push(name)
    else formsByKey.set(key, [name])
  }

  const matched = new Map<string, string>()
  for (const [key, forms] of formsByKey) {
    const tokens = key.split('\u0000')
    const hit = windows.some((window) => containsContiguous(window, tokens))
    if (!hit) continue
    const spelling = preferCatalogSpelling(forms)
    if (spelling) matched.set(key, spelling)
  }

  if (matched.size !== 1) return null
  return [...matched.values()][0] ?? null
}

/** Put extracted Pilots text back into Remarks. Never removes text already in Remarks. */
export function restoreRemarksFromExtractedPilot(remarks: string, extractedPilot: string): string {
  const note = remarks ?? ''
  const pilot = collapseSpace(extractedPilot)
  if (!pilot) return note
  const noteTrimmed = note.trim()
  if (!noteTrimmed) return pilot
  if (containsContiguous(looseTokens(noteTrimmed), looseTokens(pilot))) return note
  return `${noteTrimmed} | ${pilot}`
}

type ScanRowLike = { cells: Record<string, string> }

/**
 * Move a Pilots value the scan lifted out of the remarks box back into Remarks,
 * and drop that Pilots cell so Review can fill it from the catalog.
 */
export function foldExtractedPilotIntoRemarks<T extends ScanRowLike>(
  rows: readonly T[],
  columns: readonly { id: string; fieldKey: string | null }[]
): T[] {
  const pilotsCol = columns.find((column) => column.fieldKey === 'pilots')
  const remarksCol = columns.find((column) => column.fieldKey === 'remarks')
  if (!pilotsCol || !remarksCol) return rows.map((row) => row)

  return rows.map((row) => {
    const extracted = (row.cells[pilotsCol.id] ?? '').trim()
    if (!extracted) return row
    const cells = { ...row.cells }
    cells[remarksCol.id] = restoreRemarksFromExtractedPilot(cells[remarksCol.id] ?? '', extracted)
    delete cells[pilotsCol.id]
    return { ...row, cells }
  })
}

/**
 * Fill empty (or just-scanned) Pilots cells from Remarks.
 * Does not change Remarks, Role, or Pilot Role.
 * `fillEmptyOnly` skips cells that already have a value (late catalog load, manual entry).
 */
export function applyCatalogPilotsFromRemarks(
  grid: Grid,
  catalog: readonly string[],
  options?: { rowIndexes?: number[]; fillEmptyOnly?: boolean }
): void {
  const pilotsCol = grid.visibleColumns.value.find((column) => column.fieldKey === 'pilots')
  const remarksCol = grid.visibleColumns.value.find((column) => column.fieldKey === 'remarks')
  if (!pilotsCol || !remarksCol) return

  const indexes =
    options?.rowIndexes ?? grid.rows.value.map((_, rowIdx) => rowIdx)

  for (const rowIdx of indexes) {
    if (rowIdx < 0 || rowIdx >= grid.rows.value.length) continue
    const row = grid.rows.value[rowIdx]
    if (!row) continue
    if (row.digifiCellMeta?.[pilotsCol.id]?.userConfirmed) continue

    const current = row.cells?.[pilotsCol.id] ?? ''
    if (options?.fillEmptyOnly && current.trim()) continue

    const remarks = row.cells?.[remarksCol.id] ?? ''
    if (!options?.fillEmptyOnly && !remarks.trim()) continue

    const next = matchCatalogPilotInRemarks(remarks, catalog) ?? ''
    if (options?.fillEmptyOnly && !next) continue
    if (current === next) continue
    grid.setCell(rowIdx, pilotsCol.id, next)
  }
}
