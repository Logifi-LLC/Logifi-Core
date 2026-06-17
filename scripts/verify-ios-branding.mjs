#!/usr/bin/env node
/**
 * Sanity-check that the generated app icon has visible hatch texture
 * (not a flat black/gray fill).
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

function sampleVariance(data, width, points) {
  const values = points.map(([x, y]) => {
    const i = (y * width + x) * 4
    return luminance(data[i], data[i + 1], data[i + 2])
  })
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return { mean, variance, values }
}

async function checkIcon(filePath, label, samplePoints) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { mean, variance, values } = sampleVariance(data, info.width, samplePoints)

  if (variance < 2) {
    console.error(
      `${label}: hatch appears flat (luminance variance ${variance.toFixed(2)}, need >= 2)`
    )
    console.error(`  Sample luminances: ${values.map((v) => v.toFixed(1)).join(', ')}`)
    return false
  }

  console.log(
    `${label}: OK (mean lum ${mean.toFixed(1)}, variance ${variance.toFixed(2)})`
  )
  return true
}

async function main() {
  const sampleGrid = [
    [20, 20],
    [40, 60],
    [80, 30],
    [30, 100],
    [100, 80],
    [60, 140],
  ]

  const previewGrid = [
    [10, 10],
    [20, 30],
    [40, 15],
    [15, 50],
    [50, 40],
    [30, 70],
  ]

  const iconOk = await checkIcon(ICON_PATH, 'AppIcon-512@2x.png', sampleGrid)
  const previewOk = await checkIcon(PREVIEW_PATH, 'icon-preview-180.png', previewGrid)

  if (!iconOk || !previewOk) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
