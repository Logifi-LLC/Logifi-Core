export const SIGNATURE_EXPORT_INK_RGB = { r: 0x11, g: 0x18, b: 0x27 } as const

export function cropInkToCanvas(source: HTMLCanvasElement): HTMLCanvasElement | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const readCtx = source.getContext('2d')
  if (!readCtx) return null
  const w = source.width
  const h = source.height
  if (w <= 0 || h <= 0) return null
  const imageData = readCtx.getImageData(0, 0, w, h)
  const { data } = imageData
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  const alphaThreshold = 12
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const alpha = data[(y * w + x) * 4 + 3]
      if (alpha <= alphaThreshold) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null

  const pad = Math.max(4, Math.round(8 * dpr))
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const out = document.createElement('canvas')
  out.width = cropW
  out.height = cropH
  const outCtx = out.getContext('2d')
  if (!outCtx) return null
  outCtx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
  return out
}

export function canonicalizeExportInk(canvas: HTMLCanvasElement): void {
  const exportCtx = canvas.getContext('2d')
  if (!exportCtx) return
  const { width, height } = canvas
  const imageData = exportCtx.getImageData(0, 0, width, height)
  const { data } = imageData
  const alphaThreshold = 12
  const { r, g, b } = SIGNATURE_EXPORT_INK_RGB
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha <= alphaThreshold) {
      data[i + 3] = 0
      continue
    }
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
  exportCtx.putImageData(imageData, 0, 0)
}

export function buildExportCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const cropped = cropInkToCanvas(source)
  const target = cropped ?? source
  canonicalizeExportInk(target)
  return target
}