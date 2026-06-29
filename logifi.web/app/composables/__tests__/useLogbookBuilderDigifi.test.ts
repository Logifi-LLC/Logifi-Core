import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

const saveDraftNow = vi.fn()

vi.mock('~/composables/useLogbookBuilderDraft', () => ({
  saveDraftNow: (...args: unknown[]) => saveDraftNow(...args),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    getAccessToken: () => 'token',
    isAuthenticated: ref(true),
    user: ref({ id: 'user-1' }),
  }),
}))

vi.mock('~/composables/useDigifiCredits', () => ({
  useDigifiCredits: () => ({
    setCreditsFromScan: vi.fn(),
    fetchBalance: vi.fn(),
  }),
}))

describe('useLogbookBuilderDigifi draft save', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap
  const canvasProto = HTMLCanvasElement.prototype
  const originalGetContext = canvasProto.getContext
  const originalToBlob = canvasProto.toBlob

  beforeEach(() => {
    saveDraftNow.mockReset()
    vi.stubGlobal(
      '$fetch',
      vi.fn(async () => ({
        ok: true,
        scanId: 'scan-1',
        credits: 9,
        creditCharged: true,
        rows: [{ rowIndex: 0, cells: { date: '01/02' } }],
        filledCellCount: 1,
        modelUsed: 'test',
        strategyUsed: 'page-overview',
        chunkCount: 0,
        rescueAttempted: false,
        rescueRecoveredCount: 0,
        rowsReturned: 1,
        distinctRowIndices: [0],
        missingRowIndices: [],
        duplicateRowIndices: [],
        emptyRowIndices: [],
        hasGaps: false,
      }))
    )

    globalThis.createImageBitmap = vi.fn(async () => ({
      width: 100,
      height: 100,
      close: vi.fn(),
    })) as typeof createImageBitmap

    canvasProto.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as never

    canvasProto.toBlob = function (callback: BlobCallback) {
      callback(new Blob(['jpg'], { type: 'image/jpeg' }))
    } as never
  })

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap
    canvasProto.getContext = originalGetContext
    canvasProto.toBlob = originalToBlob
    vi.unstubAllGlobals()
  })

  it('saves draft immediately after a successful scan', async () => {
    const grid = {
      spreadId: ref('550e8400-e29b-41d4-a716-446655440000'),
      visibleColumns: ref([{ id: 'date', label: 'Date', fieldKey: 'date', order: 0 }]),
      layout: ref('single' as const),
      rowCount: ref(10),
      effectiveSplitIndex: ref(1),
      defaultYear: ref(2026),
      leftPageScanned: ref(false),
      applyScanResults: vi.fn(() => ({
        filled: 1,
        baseRow: 0,
        allowedColumnIds: ['date'],
      })),
      recordDigifiScanStatus: vi.fn(),
      resetDigifiPageState: vi.fn(),
    }

    const { useLogbookBuilderDigifi } = await import('../useLogbookBuilderDigifi')

    const Harness = defineComponent({
      setup() {
        const digifi = useLogbookBuilderDigifi()
        return { digifi }
      },
      template: '<div />',
    })

    const wrapper = mount(Harness, {
      global: {
        provide: {
          logbookBuilderGrid: grid,
        },
      },
    })

    const file = new File(['pixels'], 'scan.jpg', { type: 'image/jpeg' })
    await wrapper.vm.digifi.scanPage(file, 'left')

    expect(saveDraftNow).toHaveBeenCalledWith(grid, 'user-1')
  })
})
