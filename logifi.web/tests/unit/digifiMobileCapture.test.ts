import { describe, expect, it } from 'vitest'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  isMobileCaptureSideComplete,
  isTwoPageSpreadFullyCaptured,
  mobileSetupCaptureLabel,
  mobileTwoPageChipLabel,
  mobileTwoPageLeftChipState,
  mobileTwoPageRightChipState,
  nextMobileCaptureSide,
  shouldAutoOpenTwoPageReviewFromSetup,
} from '~/utils/digifiMobileCapture'

describe('digifiMobileCapture', () => {
  it('asks for right when left is scanned but session photo flags were reset', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    grid.leftPageScanned.value = true

    const side = nextMobileCaptureSide(grid.layout.value, grid, {
      leftPhotoCaptured: false,
      rightPhotoCaptured: false,
    })
    expect(side).toBe('right')
    expect(mobileSetupCaptureLabel(grid.layout.value, side, false)).toBe('Photograph right page')
  })

  it('does not ask for right when right scan is already on the grid', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    grid.leftPageScanned.value = true
    const rightCol = grid.visibleColumns.value.at(-1)
    expect(rightCol).toBeTruthy()
    grid.setCell(0, rightCol!.id, '1.2')

    expect(
      isMobileCaptureSideComplete(grid, 'right', false)
    ).toBe(true)

    const side = nextMobileCaptureSide(grid.layout.value, grid, {
      leftPhotoCaptured: false,
      rightPhotoCaptured: false,
    })
    expect(side).toBeNull()
  })

  it('detects when both two-page sides have grid scan data', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    expect(isTwoPageSpreadFullyCaptured(grid)).toBe(false)
    const leftCol = grid.visibleColumns.value[0]
    const rightCol = grid.visibleColumns.value.at(-1)
    expect(leftCol && rightCol).toBeTruthy()
    grid.setCell(0, leftCol!.id, '1.0')
    expect(isTwoPageSpreadFullyCaptured(grid)).toBe(false)
    grid.setCell(0, rightCol!.id, '1.0')
    expect(isTwoPageSpreadFullyCaptured(grid)).toBe(true)
  })

  it('shows Review flights only when both sides have scan data applied', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    const session = { leftPhotoCaptured: true, rightPhotoCaptured: true }
    expect(nextMobileCaptureSide(grid.layout.value, grid, session)).toBeNull()
    expect(mobileSetupCaptureLabel('two-page', null, false)).toBe('Scanning…')
    grid.leftPageScanned.value = true
    const rightCol = grid.visibleColumns.value.at(-1)!
    grid.setCell(0, rightCol.id, '1.0')
    expect(mobileSetupCaptureLabel('two-page', null, true)).toBe('Review flights')
  })

  it('keeps chip labels coherent when right scan lands before left', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    grid.leftPageScanned.value = true
    const rightCol = grid.visibleColumns.value.at(-1)!
    grid.setCell(0, rightCol.id, '1.0')
    const session = { leftPhotoCaptured: true, rightPhotoCaptured: true }
    const photoNext = nextMobileCaptureSide(grid.layout.value, grid, session)
    expect(mobileTwoPageChipLabel(mobileTwoPageLeftChipState(grid, session, photoNext))).toBe(
      'Done · Retake'
    )
    expect(mobileTwoPageChipLabel(mobileTwoPageRightChipState(grid, session, photoNext))).toBe(
      'Done · Retake'
    )
  })

  it('allows auto-review only when two-page setup has both photos and scans applied', () => {
    expect(
      shouldAutoOpenTwoPageReviewFromSetup('two-page', null, true, 'setup')
    ).toBe(true)
    expect(
      shouldAutoOpenTwoPageReviewFromSetup('two-page', 'right', true, 'setup')
    ).toBe(false)
    expect(
      shouldAutoOpenTwoPageReviewFromSetup('two-page', null, false, 'setup')
    ).toBe(false)
    expect(
      shouldAutoOpenTwoPageReviewFromSetup('two-page', null, true, 'review')
    ).toBe(false)
    expect(
      shouldAutoOpenTwoPageReviewFromSetup('single', null, true, 'setup')
    ).toBe(false)
  })

  it('shows right as scanning when photo taken but scan not applied yet', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    grid.leftPageScanned.value = true
    const session = { leftPhotoCaptured: true, rightPhotoCaptured: true }
    const photoNext = nextMobileCaptureSide(grid.layout.value, grid, session)
    expect(mobileTwoPageChipLabel(mobileTwoPageRightChipState(grid, session, photoNext))).toBe(
      'Scanning…'
    )
    expect(mobileSetupCaptureLabel('two-page', photoNext, false)).toBe('Scanning…')
  })
})
