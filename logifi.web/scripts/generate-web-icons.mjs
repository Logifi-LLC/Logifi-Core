#!/usr/bin/env node
/**
 * Generate real-size web favicons and OG card from the white logifi mark.
 * Usage: node scripts/generate-web-icons.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const FAVICON_SRC = path.join(PUBLIC, 'favicon.png')
const MARK_SRC = path.join(PUBLIC, 'images/app-logo-mark.png')

const APP_BG = '#030712'
const GLOW_CENTER = '#141e33'
const NAVY = '#0b1f4a'

function glowSvg(size) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.7
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${GLOW_CENTER}" stop-opacity="1"/>
      <stop offset="70%" stop-color="${GLOW_CENTER}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${APP_BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${APP_BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow)"/>
</svg>`
}

async function loadTightWhiteMark() {
  const faviconBuffer = await fs.readFile(FAVICON_SRC)
  const { data, info } = await sharp(faviconBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let minX = info.width
  let minY = info.height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (lum > 64) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = 255
      } else {
        data[i + 3] = 0
      }
    }
  }

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).extract({ left: minX, top: minY, width: cropW, height: cropH })
}

async function buildSquareIcon(size, markScale) {
  const targetWidth = Math.round(size * markScale)
  const background = await sharp(Buffer.from(glowSvg(size))).png().toBuffer()
  const markLayer = await loadTightWhiteMark().then((pipeline) =>
    pipeline.resize(targetWidth, targetWidth, { fit: 'inside' }).png().toBuffer()
  )
  const { width: mw, height: mh } = await sharp(markLayer).metadata()
  const left = Math.round((size - mw) / 2)
  const top = Math.round((size - mh) / 2)
  return sharp(background)
    .composite([{ input: markLayer, left, top }])
    .png()
    .toBuffer()
}

function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY}"/>
  <text x="430" y="300" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="92" font-weight="700">Logifi</text>
  <text x="430" y="372" fill="#c7d2fe" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="500">Digital Pilot Logbooks</text>
  <text x="430" y="430" fill="#93c5fd" font-family="system-ui, -apple-system, sans-serif" font-size="24">Free · FAA-compliant · Open source</text>
</svg>`
}

async function buildOgImage() {
  const background = await sharp(Buffer.from(ogSvg())).png().toBuffer()
  const mark = await sharp(MARK_SRC)
    .resize(280, 280, { fit: 'cover' })
    .png()
    .toBuffer()
  return sharp(background)
    .composite([{ input: mark, left: 90, top: 175 }])
    .png()
    .toBuffer()
}

async function main() {
  await fs.access(FAVICON_SRC)
  await fs.access(MARK_SRC)

  const fav16 = await buildSquareIcon(16, 0.78)
  const fav32 = await buildSquareIcon(32, 0.74)
  const apple = await buildSquareIcon(180, 0.62)
  const og = await buildOgImage()

  await fs.writeFile(path.join(PUBLIC, 'favicon-16.png'), fav16)
  await fs.writeFile(path.join(PUBLIC, 'favicon-32.png'), fav32)
  await fs.writeFile(path.join(PUBLIC, 'apple-touch-icon.png'), apple)
  await fs.writeFile(path.join(PUBLIC, 'images/og-image.png'), og)
  await fs.copyFile(path.join(PUBLIC, 'favicon-32.png'), path.join(PUBLIC, 'favicon.ico'))

  console.log('Wrote favicon-16.png, favicon-32.png, apple-touch-icon.png, images/og-image.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
