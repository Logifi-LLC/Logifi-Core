import { encode } from 'uqr'

function matrixFromEncode(result: { data: boolean[][] | boolean[]; size: number }): boolean[][] {
  const { data, size } = result
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return data as boolean[][]
  }
  const flat = data as boolean[]
  const matrix: boolean[][] = []
  for (let y = 0; y < size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < size; x++) {
      row.push(Boolean(flat[y * size + x]))
    }
    matrix.push(row)
  }
  return matrix
}

/** Local SVG data URL so the token never goes to a third-party QR host. */
export function qrSvgDataUrl(text: string, sizePx = 240): string {
  const payload = text.trim()
  if (!payload) {
    throw new Error('QR payload is required')
  }
  const encoded = encode(payload)
  const matrix = matrixFromEncode(encoded)
  const modules = matrix.length
  const quiet = 2
  const dim = modules + quiet * 2
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges">`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
  ]
  for (let y = 0; y < modules; y++) {
    const row = matrix[y] || []
    for (let x = 0; x < modules; x++) {
      if (!row[x]) continue
      parts.push(`<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1" fill="#000000"/>`)
    }
  }
  parts.push('</svg>')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(parts.join(''))}`
}
