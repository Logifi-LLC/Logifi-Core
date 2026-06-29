import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { setupBuilderDraftFlush } from '../useLogbookBuilderDraft'

const writeDraftToStorage = vi.fn()
const clearDraftStorage = vi.fn()

vi.mock('~/utils/logbookBuilderDraft', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/logbookBuilderDraft')>()
  return {
    ...actual,
    writeDraftToStorage: (...args: unknown[]) => writeDraftToStorage(...args),
    clearDraftStorage: (...args: unknown[]) => clearDraftStorage(...args),
  }
})

function createGridWithContent() {
  return {
    spreadId: ref('550e8400-e29b-41d4-a716-446655440000'),
    columns: ref([
      { id: 'date', fieldKey: 'date' as const, label: 'Date', order: 0, width: 80 },
    ]),
    layout: ref('single' as const),
    rowCount: ref(1),
    twoPageSplitIndex: ref(1),
    tagsColumnWidth: ref(80),
    defaultImportRole: ref('PIC'),
    defaultYear: ref(2026),
    rows: ref([{ cells: { date: '01/02' } }]),
    leftPageScanned: ref(true),
    singleLayoutRightStartRow: ref(0),
  }
}

describe('setupBuilderDraftFlush', () => {
  beforeEach(() => {
    writeDraftToStorage.mockReset()
    clearDraftStorage.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes draft on pagehide', () => {
    const grid = createGridWithContent()
    const stop = setupBuilderDraftFlush(grid as never, 'user-1')

    window.dispatchEvent(new Event('pagehide'))

    expect(writeDraftToStorage).toHaveBeenCalled()
    stop()
  })
})
