import { describe, expect, it } from 'vitest'
import {
  pickNextPendingMobileScan,
  upsertPendingMobileScan,
  type PendingMobileScan,
} from '~/utils/digifiMobileScanQueue'

function fileNamed(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' })
}

describe('digifiMobileScanQueue', () => {
  it('prefers left scan jobs before right', () => {
    const pending: PendingMobileScan[] = [
      { pageSide: 'right', file: fileNamed('right.jpg') },
      { pageSide: 'left', file: fileNamed('left.jpg') },
    ]
    const next = pickNextPendingMobileScan(pending, 'two-page', true)
    expect(next?.pageSide).toBe('left')
  })

  it('holds right scan until left page results are applied', () => {
    const pending: PendingMobileScan[] = [{ pageSide: 'right', file: fileNamed('right.jpg') }]
    expect(pickNextPendingMobileScan(pending, 'two-page', false)).toBeNull()
    expect(pickNextPendingMobileScan(pending, 'two-page', true)?.pageSide).toBe('right')
  })

  it('replaces pending file for the same page side', () => {
    const first = upsertPendingMobileScan([], 'left', fileNamed('a.jpg'))
    const second = upsertPendingMobileScan(first, 'left', fileNamed('b.jpg'))
    expect(second).toHaveLength(1)
    expect(second[0]?.file.name).toBe('b.jpg')
  })
})
