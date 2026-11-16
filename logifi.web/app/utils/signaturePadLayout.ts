/** CSS pixel size of the drawable pad; frame and canvas must match these values. */

export function resolveSignaturePadCssSize(input: {
  fillParent: boolean
  frameWidth: number
  frameHeight: number
  fixedHeight: number
  minWidth?: number
}): { width: number; height: number } | null {
  const minWidth = input.minWidth ?? 280
  const frameWidth = Math.floor(input.frameWidth)
  const frameHeight = Math.floor(input.frameHeight)

  if (input.fillParent) {
    if (frameWidth <= 0 || frameHeight <= 0) return null
    return {
      width: Math.max(minWidth, frameWidth),
      height: frameHeight,
    }
  }

  if (frameWidth <= 0) return null
  const height = input.fixedHeight
  if (height <= 0) return null
  return {
    width: Math.max(minWidth, frameWidth),
    height,
  }
}