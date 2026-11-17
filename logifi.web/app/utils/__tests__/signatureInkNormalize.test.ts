import { describe, expect, it } from 'vitest'
import {
  findInkBoundingBox,
  normalizeSignatureImageData,
  SIGNATURE_INK_ALPHA_THRESHOLD,
  SIGNATURE_NORMALIZE_TARGET_WIDTH,
} from '../signatureInkNormalize'
import { SIGNATURE_EXPORT_INK_RGB } from '../signaturePadExport'

function inkPixel(imageData: ImageData, x: number, y: number): void {
  const i = (y * imageData.width + x) * 4
  const { r, g, b } = SIGNATURE_EXPORT_INK_RGB
  imageData.data[i] = r
  imageData.data[i + 1] = g
  imageData.data[i + 2] = b
  imageData.data[i + 3] = 200
}

function blankImageData(w: number, h: number): ImageData {
  return new ImageData(w, h)
}

describe('findInkBoundingBox', () => {
  it('returns null when the canvas is empty', () => {
    const img = blankImageData(80, 80)
    expect(findInkBoundingBox(img.width, img.height, img.data)).toBeNull()
  })

  it('finds a sparse ink cluster', () => {
    const img = blankImageData(100, 100)
    inkPixel(img, 30, 40)
    inkPixel(img, 45, 41)
    inkPixel(img, 60, 42)
    const box = findInkBoundingBox(img.width, img.height, img.data)
    expect(box).toMatchObject({ minX: 30, maxX: 60, minY: 40, maxY: 42 })
  })
})

describe('normalizeSignatureImageData', () => {
  it('crops sparse ink to its bounding box', () => {
    const img = blankImageData(200, 200)
    for (let x = 50; x <= 70; x += 1) {
      inkPixel(img, x, 80)
    }
    const out = normalizeSignatureImageData(img, {
      targetWidth: 80,
      maxHeight: 80,
    })
    expect(out).not.toBeNull()
    expect(out!.width).toBeLessThan(200)
    expect(out!.height).toBeLessThan(200)
    const box = findInkBoundingBox(out!.width, out!.height, out!.data)!
    expect(box.width).toBeLessThan(180)
    expect(box.height).toBeLessThan(40)
  })

  it('rotates a tall narrow ink box 90° to read left-to-right', () => {
    const img = blankImageData(120, 120)
    for (let y = 20; y <= 90; y += 3) {
      inkPixel(img, 60, y)
    }
    const out = normalizeSignatureImageData(img, {
      targetWidth: 200,
      maxHeight: 200,
      tallVsWideRatio: 1.3,
    })
    expect(out).not.toBeNull()
    expect(out!.width).toBeGreaterThan(out!.height)
  })

  it('keeps a wide ink box unrotated', () => {
    const img = blankImageData(120, 120)
    for (let x = 10; x <= 100; x += 2) {
      inkPixel(img, x, 60)
    }
    const out = normalizeSignatureImageData(img, {
      targetWidth: 200,
      maxHeight: 200,
    })
    expect(out).not.toBeNull()
    expect(out!.width).toBeGreaterThan(out!.height)
  })

  it('outputs transparent background outside ink', () => {
    const img = blankImageData(64, 64)
    inkPixel(img, 32, 32)
    const out = normalizeSignatureImageData(img, {
      targetWidth: 32,
      maxHeight: 32,
    })!
    expect(out).not.toBeNull()
    let transparent = 0
    let ink = 0
    for (let i = 3; i < out.data.length; i += 4) {
      if (out.data[i] <= SIGNATURE_INK_ALPHA_THRESHOLD) transparent += 1
      else ink += 1
    }
    expect(ink).toBeGreaterThan(0)
    expect(transparent).toBeGreaterThan(ink)
  })

  it('scales toward the default target width', () => {
    const img = blankImageData(800, 200)
    for (let x = 50; x < 750; x += 1) {
      inkPixel(img, x, 100)
    }
    const out = normalizeSignatureImageData(img)!
    expect(out).not.toBeNull()
    expect(out!.width).toBeLessThanOrEqual(SIGNATURE_NORMALIZE_TARGET_WIDTH)
  })
})