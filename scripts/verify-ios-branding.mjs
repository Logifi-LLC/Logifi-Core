#!/usr/bin/env node
/**
 * Sanity-check that the generated app icon has a visible radial glow
 * (center brighter than corners) and a white mark in the middle.
 *
 * Usage: npm run verify:ios-branding
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('../logifi.web/node_modules/sharp')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const ICON_PATH = path.join(
  ROOT,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
)
const PREVIEW_PATH = path.join(
  ROOT,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/icon-preview-180.png'
)

function luminance(r, g, b) {
  return (r + g + b) / 3
}

function sampleLum(data, width, x, y) {
  const i = (y * width + x) * 4
  return luminance(data[i], data[i + 1], data[i + 2])
}

async function checkIcon(filePath, label) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const margin = Math.max(4, Math.floor(w * 0.04))
  const cx = Math.floor(w / 2)
  const cy = Math.floor(h / 2)

  const cornerLums = [
    sampleLum(data, w, margin, margin),
    sampleLum(data, w, w - 1 - margin, margin),
    sampleLum(data, w, margin, h - 1 - margin),
    sampleLum(data, w, w - 1 - margin, h - 1 - margin),
  ]
  const cornerMean =
    cornerLums.reduce((a, b) => a + b, 0) / cornerLums.length

  // Corner brackets leave the geometric center empty — scan for any near-white pixel
  let maxMarkLum = 0
  const scanMargin = Math.floor(w * 0.15)
  for (let y = scanMargin; y < h - scanMargin; y += Math.max(1, Math.floor(w / 64))) {
    for (let x = scanMargin; x < w - scanMargin; x += Math.max(1, Math.floor(w / 64))) {
      maxMarkLum = Math.max(maxMarkLum, sampleLum(data, w, x, y))
    }
  }
  const hasWhiteMark = maxMarkLum > 200

  // Sample glow in a band outside the mark extent (~40% radius from center, away from corners)
  const glowR = Math.floor(w * 0.38)
  const glowLums = [
    sampleLum(data, w, cx - glowR, cy),
    sampleLum(data, w, cx + glowR, cy),
    sampleLum(data, w, cx, cy - glowR),
    sampleLum(data, w, cx, cy + glowR),
  ]
  const glowMean = glowLums.reduce((a, b) => a + b, 0) / glowLums.length

  if (glowMean <= cornerMean + 2) {
    console.error(
      `${label}: glow appears missing (glow band ${glowMean.toFixed(1)} vs corner ${cornerMean.toFixed(1)}, need glow > corner + 2)`
    )
    return false
  }

  if (!hasWhiteMark) {
    console.error(
      `${label}: white mark not detected (max lum in center region ${maxMarkLum.toFixed(1)})`
    )
    return false
  }

  console.log(
    `${label}: OK (corner ${cornerMean.toFixed(1)}, glow ${glowMean.toFixed(1)}, mark max ${maxMarkLum.toFixed(1)})`
  )
  return true
}

async function main() {
  const iconOk = await checkIcon(ICON_PATH, 'AppIcon-512@2x.png')
  const previewOk = await checkIcon(PREVIEW_PATH, 'icon-preview-180.png')

  if (!iconOk || !previewOk) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
