import { onMounted, onUnmounted, unref } from 'vue'
import type { MaybeRef } from 'vue'

export function useLogbookBuilderKeyboard(options: {
  rowCount: MaybeRef<number>
  columnCount: MaybeRef<number>
  focusCell: (row: number, col: number) => void
  columnIdAt: (colIndex: number) => string
}) {
  const { focusCell } = options

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    const tagName = target.tagName?.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea') {
      const row = parseInt(target.dataset?.builderRow ?? '', 10)
      const col = parseInt(target.dataset?.builderCol ?? '', 10)
      if (Number.isNaN(row) || Number.isNaN(col)) return

      const rows = unref(options.rowCount)
      const cols = unref(options.columnCount)

      let nextRow = row
      let nextCol = col

      switch (e.key) {
        case 'Tab':
          if (e.shiftKey) {
            if (nextCol > 0) nextCol--
            else if (nextRow > 0) {
              nextRow--
              nextCol = cols - 1
            }
          } else {
            if (nextCol < cols - 1) nextCol++
            else if (nextRow < rows - 1) {
              nextRow++
              nextCol = 0
            }
          }
          e.preventDefault()
          focusCell(nextRow, nextCol)
          return
        case 'Enter':
          if (nextRow < rows - 1) {
            nextRow++
            e.preventDefault()
            focusCell(nextRow, nextCol)
          }
          return
        case 'ArrowRight':
          if (nextCol < cols - 1) {
            nextCol++
            e.preventDefault()
            focusCell(nextRow, nextCol)
          }
          return
        case 'ArrowLeft':
          if (nextCol > 0) {
            nextCol--
            e.preventDefault()
            focusCell(nextRow, nextCol)
          }
          return
        case 'ArrowDown':
          if (nextRow < rows - 1) {
            nextRow++
            e.preventDefault()
            focusCell(nextRow, nextCol)
          }
          return
        case 'ArrowUp':
          if (nextRow > 0) {
            nextRow--
            e.preventDefault()
            focusCell(nextRow, nextCol)
          }
          return
        default:
          break
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown, true)
  })
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, true)
  })
}
