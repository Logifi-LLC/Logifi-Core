import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import type {
  DigifiPageSide,
  DigifiSpreadRecoveryPage,
  DigifiSpreadRecoveryResponse,
} from '~/utils/digifiTypes'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

function columnIdsForPageSide(
  grid: Grid,
  pageSide: DigifiPageSide
): string[] {
  const cols = [...grid.visibleColumns.value].sort((a, b) => a.order - b.order)
  if (grid.layout.value !== 'two-page') {
    return cols.map((c) => c.id)
  }
  const split = grid.effectiveSplitIndex.value
  if (pageSide === 'left') {
    return cols.slice(0, split).map((c) => c.id)
  }
  return cols.slice(split).map((c) => c.id)
}

export function pageHasScanData(grid: Grid, pageSide: DigifiPageSide): boolean {
  const colIds = columnIdsForPageSide(grid, pageSide)
  if (colIds.length === 0) return false

  for (let rowIdx = 0; rowIdx < grid.rows.value.length; rowIdx++) {
    const row = grid.rows.value[rowIdx]
    for (const colId of colIds) {
      if ((row.cells?.[colId] ?? '').trim()) {
        return true
      }
    }
  }

  return false
}

function authHeaders(getAccessToken: () => string | null): Record<string, string> {
  const token = getAccessToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function recoverDigifiSpreadFromServer(input: {
  grid: Grid
  spreadId: string
  getAccessToken: () => string | null
}): Promise<{ recoveredPages: number }> {
  const { grid, spreadId, getAccessToken } = input

  let response: DigifiSpreadRecoveryResponse
  try {
    response = await $fetch<DigifiSpreadRecoveryResponse>(
      `/api/digifi/spread/${encodeURIComponent(spreadId)}`,
      {
        method: 'GET',
        headers: authHeaders(getAccessToken),
      }
    )
  } catch {
    return { recoveredPages: 0 }
  }

  let recoveredPages = 0

  for (const page of response.pages) {
    if (pageHasScanData(grid, page.pageSide)) {
      continue
    }

    applyRecoveryPage(grid, page)
    recoveredPages++
  }

  return { recoveredPages }
}

function applyRecoveryPage(grid: Grid, page: DigifiSpreadRecoveryPage): void {
  const applied = grid.applyScanResults(page.pageSide, page.rows)

  grid.recordDigifiScanStatus({
    pageSide: page.pageSide,
    expectedRowCount: grid.rowCount.value,
    baseRow: page.baseRow ?? applied.baseRow,
    allowedColumnIds: page.allowedColumnIds ?? applied.allowedColumnIds,
    rowsReturned: page.rowsReturned,
    distinctRowIndices: page.distinctRowIndices,
    missingRowIndices: page.missingRowIndices,
    duplicateRowIndices: page.duplicateRowIndices,
    emptyRowIndices: page.emptyRowIndices,
    hasGaps: page.hasGaps,
    strategyUsed: page.strategyUsed,
    chunkCount: page.chunkCount,
    rescueAttempted: page.rescueAttempted,
    rescueRecoveredCount: page.rescueRecoveredCount,
  })
}

export function useDigifiSpreadRecovery() {
  return {
    recoverDigifiSpreadFromServer,
    pageHasScanData,
    columnIdsForPageSide,
  }
}
