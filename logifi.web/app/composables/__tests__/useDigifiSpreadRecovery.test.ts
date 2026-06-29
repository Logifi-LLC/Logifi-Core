import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { recoverDigifiSpreadFromServer, pageHasScanData } from '../useDigifiSpreadRecovery'
import type { DigifiSpreadRecoveryResponse } from '~/utils/digifiTypes'

const SPREAD_ID = '550e8400-e29b-41d4-a716-446655440000'

function createGrid() {
  const columns = ref([
    {
      id: 'col-date',
      fieldKey: 'date' as const,
      label: 'Date',
      order: 0,
      width: 80,
    },
    {
      id: 'col-remarks',
      fieldKey: 'remarks' as const,
      label: 'Remarks',
      order: 1,
      width: 120,
    },
  ])

  const rows = ref([
    { cells: { 'col-date': '', 'col-remarks': '' } },
    { cells: { 'col-date': '', 'col-remarks': '' } },
  ])

  const layout = ref<'single' | 'two-page'>('single')
  const rowCount = ref(2)
  const effectiveSplitIndex = ref(1)
  const leftPageScanned = ref(false)
  const singleLayoutRightStartRow = ref(0)
  const digifiScanStatusByPage = ref({})

  const applyScanResults = vi.fn(() => ({
    filled: 1,
    baseRow: 0,
    allowedColumnIds: ['col-date', 'col-remarks'],
  }))
  const recordDigifiScanStatus = vi.fn()

  const grid = {
    columns,
    rows,
    layout,
    rowCount,
    effectiveSplitIndex,
    leftPageScanned,
    singleLayoutRightStartRow,
    digifiScanStatusByPage,
    visibleColumns: columns,
    applyScanResults,
    recordDigifiScanStatus,
  }

  return { grid, applyScanResults, recordDigifiScanStatus }
}

describe('pageHasScanData', () => {
  it('detects when a page already has cell values', () => {
    const { grid } = createGrid()
    expect(pageHasScanData(grid as never, 'left')).toBe(false)

    grid.rows.value[0].cells['col-date'] = '01/02'
    expect(pageHasScanData(grid as never, 'left')).toBe(true)
  })
})

describe('recoverDigifiSpreadFromServer', () => {
  beforeEach(() => {
    vi.stubGlobal(
      '$fetch',
      vi.fn(async () => ({ spreadId: SPREAD_ID, pages: [] }) as DigifiSpreadRecoveryResponse)
    )
  })

  it('applies server pages that are missing locally', async () => {
    const { grid, applyScanResults, recordDigifiScanStatus } = createGrid()

    vi.mocked($fetch).mockResolvedValueOnce({
      spreadId: SPREAD_ID,
      pages: [
        {
          scanId: 'scan-1',
          pageSide: 'left',
          rows: [{ rowIndex: 0, cells: { 'col-date': '01/03' } }],
          filledCellCount: 1,
          rowsReturned: 1,
          distinctRowIndices: [0],
          missingRowIndices: [],
          duplicateRowIndices: [],
          emptyRowIndices: [],
          hasGaps: false,
          strategyUsed: 'page-overview',
          chunkCount: 0,
          rescueAttempted: false,
          rescueRecoveredCount: 0,
        },
      ],
    })

    const result = await recoverDigifiSpreadFromServer({
      grid: grid as never,
      spreadId: SPREAD_ID,
      getAccessToken: () => 'token',
    })

    expect(result.recoveredPages).toBe(1)
    expect(applyScanResults).toHaveBeenCalledWith('left', [
      { rowIndex: 0, cells: { 'col-date': '01/03' } },
    ])
    expect(recordDigifiScanStatus).toHaveBeenCalled()
  })

  it('skips pages that already have grid data', async () => {
    const { grid, applyScanResults } = createGrid()
    grid.rows.value[0].cells['col-date'] = 'existing'

    vi.mocked($fetch).mockResolvedValueOnce({
      spreadId: SPREAD_ID,
      pages: [
        {
          scanId: 'scan-1',
          pageSide: 'left',
          rows: [{ rowIndex: 0, cells: { 'col-date': '01/03' } }],
          filledCellCount: 1,
          rowsReturned: 1,
          distinctRowIndices: [0],
          missingRowIndices: [],
          duplicateRowIndices: [],
          emptyRowIndices: [],
          hasGaps: false,
          strategyUsed: 'page-overview',
          chunkCount: 0,
          rescueAttempted: false,
          rescueRecoveredCount: 0,
        },
      ],
    })

    const result = await recoverDigifiSpreadFromServer({
      grid: grid as never,
      spreadId: SPREAD_ID,
      getAccessToken: () => 'token',
    })

    expect(result.recoveredPages).toBe(0)
    expect(applyScanResults).not.toHaveBeenCalled()
  })
})
