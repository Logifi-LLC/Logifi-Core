import { describe, expect, it } from 'vitest'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  isMobileCaptureSideComplete,
  mobileCaptureLabel,
  nextMobileCaptureSide,
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
    expect(mobileCaptureLabel(side, grid.layout.value)).toBe('Photograph right page')
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

  it('treats session right photo as complete even before scan lands', () => {
    const grid = useLogbookBuilderGrid()
    grid.layout.value = 'two-page'
    grid.leftPageScanned.value = true

    const side = nextMobileCaptureSide(grid.layout.value, grid, {
      leftPhotoCaptured: true,
      rightPhotoCaptured: true,
    })
    expect(side).toBeNull()
  })
})
