import sharp from 'sharp'

export const DIGIFI_GEMINI_IMAGE_MAX_EDGE_PX = 1024
export const DIGIFI_GEMINI_JPEG_QUALITY = 75

export interface DigifiCompressedImage {
  buffer: Buffer
  mimeType: 'image/jpeg'
  base64: string
  byteLength: number
}

/**
 * Resize and JPEG-compress logbook photos before Gemini to cut vision token usage.
 */
export async function compressDigifiImageForGemini(
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
