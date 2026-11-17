import { orientationCorrectionDegrees } from './signaturePadOrientation'

export const SIGNATURE_EXPORT_INK_RGB = { r: 0x11, g: 0x18, b: 0x27 } as const

export const SIGNATURE_NORMALIZE_TARGET_WIDTH = 600
export const SIGNATURE_NORMALIZE_MAX_HEIGHT = 300
export const SIGNATURE_INK_ALPHA_THRESHOLD = 12

const TALL_VS_WIDE_RATIO = 1.3
const BBOX_PAD_RATIO = 0.04
const OUTPUT_MIN_STROKE_PX = 4

export type InkBoundingBox = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

/** Bounding box of pixels with visible alpha (ink). */
export function findInkBoundingBox(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  alphaThreshold = SIGNATURE_INK_ALPHA_THRESHOLD
): InkBoundingBox | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha <= alphaThreshold) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function cropImageData(
  source: ImageData,
  minX: number,
  minY: number,
  cropW: number,
  cropH: number
): ImageData {
  const out = new ImageData(cropW, cropH)
  for (let y = 0; y < cropH; y += 1) {
    for (let x = 0; x < cropW; x += 1) {
      const srcIdx = ((minY + y) * source.width + (minX + x)) * 4
      const dstIdx = (y * cropW + x) * 4
      out.data[dstIdx] = source.data[srcIdx]
      out.data[dstIdx + 1] = source.data[srcIdx + 1]
      out.data[dstIdx + 2] = source.data[srcIdx + 2]
      out.data[dstIdx + 3] = source.data[srcIdx + 3]
    }
  }
  return out
}

/**
 * 90° counterclockwise — legacy tall-bbox fallback when no capture angle was stored
 * (phone held clockwise while the signing page stays portrait).
 */
export function rotateImageData90CounterClockwise(source: ImageData): ImageData {
  const { width: w, height: h, data } = source
  const out = new ImageData(h, w)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const srcIdx = (y * w + x) * 4
      const newX = y
      const newY = w - 1 - x
      const dstIdx = (newY * h + newX) * 4
      out.data[dstIdx] = data[srcIdx]
      out.data[dstIdx + 1] = data[srcIdx + 1]
      out.data[dstIdx + 2] = data[srcIdx + 2]
      out.data[dstIdx + 3] = data[srcIdx + 3]
    }
  }
  return out
}

function rotateImageData90Clockwise(source: ImageData): ImageData {
  const { width: w, height: h, data } = source
  const out = new ImageData(h, w)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const srcIdx = (y * w + x) * 4
      const newX = h - 1 - y
      const newY = x
      const dstIdx = (newY * h + newX) * 4
      out.data[dstIdx] = data[srcIdx]
      out.data[dstIdx + 1] = data[srcIdx + 1]
      out.data[dstIdx + 2] = data[srcIdx + 2]
      out.data[dstIdx + 3] = data[srcIdx + 3]
    }
  }
  return out
}

function rotateImageData180(source: ImageData): ImageData {
  const { width: w, height: h, data } = source
  const out = new ImageData(w, h)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const srcIdx = (y * w + x) * 4
      const newX = w - 1 - x
      const newY = h - 1 - y
      const dstIdx = (newY * w + newX) * 4
      out.data[dstIdx] = data[srcIdx]
      out.data[dstIdx + 1] = data[srcIdx + 1]
      out.data[dstIdx + 2] = data[srcIdx + 2]
      out.data[dstIdx + 3] = data[srcIdx + 3]
    }
  }
  return out
}

export function rotateImageDataByDegrees(source: ImageData, degrees: number): ImageData {
  const d = ((degrees % 360) + 360) % 360
  if (d === 0) return source
  if (d === 90) return rotateImageData90Clockwise(source)
  if (d === 180) return rotateImageData180(source)
  return rotateImageData90CounterClockwise(source)
}

function scaleImageData(source: ImageData, outW: number, outH: number): ImageData {
  const out = new ImageData(outW, outH)
  const { width: srcW, height: srcH, data: src } = source
  for (let y = 0; y < outH; y += 1) {
    const srcY = Math.min(srcH - 1, Math.floor((y * srcH) / outH))
    for (let x = 0; x < outW; x += 1) {
      const srcX = Math.min(srcW - 1, Math.floor((x * srcW) / outW))
      const srcIdx = (srcY * srcW + srcX) * 4
      const dstIdx = (y * outW + x) * 4
      out.data[dstIdx] = src[srcIdx]
      out.data[dstIdx + 1] = src[srcIdx + 1]
      out.data[dstIdx + 2] = src[srcIdx + 2]
      out.data[dstIdx + 3] = src[srcIdx + 3]
    }
  }
  return out
}

function canonicalizeInkPixels(imageData: ImageData): void {
  const { data } = imageData
  const { r, g, b } = SIGNATURE_EXPORT_INK_RGB
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha <= SIGNATURE_INK_ALPHA_THRESHOLD) {
      data[i + 3] = 0
      continue
    }
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = 255
  }
}

function dilateInk(imageData: ImageData, iterations: number): void {
  const { width, height } = imageData
  let mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = imageData.data[i * 4 + 3] > SIGNATURE_INK_ALPHA_THRESHOLD ? 1 : 0
  }
  for (let pass = 0; pass < iterations; pass += 1) {
    const next = new Uint8Array(mask)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!mask[y * width + x]) continue
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            next[ny * width + nx] = 1
          }
        }
      }
    }
    mask = next
  }
  const { r, g, b } = SIGNATURE_EXPORT_INK_RGB
  const { data } = imageData
  for (let i = 0; i < mask.length; i += 1) {
    const px = i * 4
    if (mask[i]) {
      data[px] = r
      data[px + 1] = g
      data[px + 2] = b
      data[px + 3] = 255
    } else {
      data[px + 3] = 0
    }
  }
}

/**
 * Crop, upright, scale, and thicken signature ink for display and export.
 */
export type SignatureNormalizeOptions = {
  targetWidth?: number
  maxHeight?: number
  padRatio?: number
  tallVsWideRatio?: number
  /** screen.orientation.angle sampled during signing (export only). */
  captureOrientationDegrees?: number
  /** Legacy / display path: CCW tall-bbox guess when no capture angle. Default true. */
  useTallBboxFallback?: boolean
}

export function normalizeSignatureImageData(
  source: ImageData,
  options?: SignatureNormalizeOptions
): ImageData | null {
  const targetWidth = options?.targetWidth ?? SIGNATURE_NORMALIZE_TARGET_WIDTH
  const maxHeight = options?.maxHeight ?? SIGNATURE_NORMALIZE_MAX_HEIGHT
  const padRatio = options?.padRatio ?? BBOX_PAD_RATIO
  const tallVsWideRatio = options?.tallVsWideRatio ?? TALL_VS_WIDE_RATIO

  const bbox = findInkBoundingBox(source.width, source.height, source.data)
  if (!bbox) return null

  const padX = Math.max(1, Math.round(bbox.width * padRatio))
  const padY = Math.max(1, Math.round(bbox.height * padRatio))
  const minX = Math.max(0, bbox.minX - padX)
  const minY = Math.max(0, bbox.minY - padY)
  const maxX = Math.min(source.width - 1, bbox.maxX + padX)
  const maxY = Math.min(source.height - 1, bbox.maxY + padY)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  let working = cropImageData(source, minX, minY, cropW, cropH)

  const captureAngle = options?.captureOrientationDegrees
  const useTallFallback = options?.useTallBboxFallback !== false
  if (captureAngle != null && captureAngle !== 0) {
    working = rotateImageDataByDegrees(
      working,
      orientationCorrectionDegrees(captureAngle)
    )
  } else if (useTallFallback && cropH > tallVsWideRatio * cropW) {
    working = rotateImageData90CounterClockwise(working)
  }

  let scale = targetWidth / working.width
  if (working.height * scale > maxHeight) {
    scale = maxHeight / working.height
  }
  const outW = Math.max(1, Math.round(working.width * scale))
  const outH = Math.max(1, Math.round(working.height * scale))

  let normalized = scaleImageData(working, outW, outH)
  canonicalizeInkPixels(normalized)
  const dilatePasses = Math.max(1, Math.ceil(OUTPUT_MIN_STROKE_PX / 2) - 1)
  dilateInk(normalized, dilatePasses)
  return normalized
}

export function normalizeSignatureCanvas(
  source: HTMLCanvasElement,
  options?: SignatureNormalizeOptions
): HTMLCanvasElement | null {
  const readCtx = source.getContext('2d')
  if (!readCtx) return null
  if (source.width <= 0 || source.height <= 0) return null
  const imageData = readCtx.getImageData(0, 0, source.width, source.height)
  const normalized = normalizeSignatureImageData(imageData, options)
  if (!normalized) return null
  const out = document.createElement('canvas')
  out.width = normalized.width
  out.height = normalized.height
  const outCtx = out.getContext('2d')
  if (!outCtx) return null
  outCtx.putImageData(normalized, 0, 0)
  return out
}

export function normalizeSignatureFromImageElement(img: HTMLImageElement): string | null {
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const out = normalizeSignatureCanvas(canvas, { useTallBboxFallback: true })
  if (!out) return null
  return out.toDataURL('image/png')
}

export function normalizeSignatureFromUrl(url: string): Promise<string | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        resolve(normalizeSignatureFromImageElement(img))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}