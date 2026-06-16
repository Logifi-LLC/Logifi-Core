import sharp from 'sharp'

/** Larger edge + quality for paid-tier OCR accuracy (still JPEG for API payload size). */
export const DIGIFI_GEMINI_IMAGE_MAX_EDGE_PX = 1536
export const DIGIFI_GEMINI_JPEG_QUALITY = 88

export interface DigifiCompressedImage {
  buffer: Buffer
  mimeType: 'image/jpeg'
  base64: string
  byteLength: number
}

/**
 * Resize and JPEG-compress logbook photos before vision API calls to cut token usage.
 */
export async function compressDigifiImage(
  buffer: Buffer,
  _mimeType?: string
): Promise<DigifiCompressedImage> {
  const out = await sharp(buffer)
    .rotate()
    .resize(DIGIFI_GEMINI_IMAGE_MAX_EDGE_PX, DIGIFI_GEMINI_IMAGE_MAX_EDGE_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: DIGIFI_GEMINI_JPEG_QUALITY, mozjpeg: true })
    .toBuffer()

  return {
    buffer: out,
    mimeType: 'image/jpeg',
    base64: out.toString('base64'),
    byteLength: out.length,
  }
}

/** @deprecated Use compressDigifiImage */
export const compressDigifiImageForGemini = compressDigifiImage
