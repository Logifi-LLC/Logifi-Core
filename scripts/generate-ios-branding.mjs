#!/usr/bin/env node
/**
 * Generate iOS splash + app icon from favicon.png:
 * - App icon / splash / web logo: gray-950 radial glow + white mark composite
 *
 * Usage: npm run generate:ios-branding
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const require = createRequire(import.meta.url)
const sharp = require('../logifi.web/node_modules/sharp')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const FAVICON = path.join(ROOT, 'logifi.web/public/favicon.png')
const SPLASH_DIR = path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset')
const ICON_DIR = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
const ICON_PATH = path.join(ICON_DIR, 'AppIcon-512@2x.png')
const ICON_PREVIEW_PATH = path.join(ICON_DIR, 'icon-preview-180.png')
const WEB_LOGO_MARK = path.join(ROOT, 'logifi.web/public/images/app-logo-mark.png')

const SPLASH_SIZE = 2732
const ICON_SIZE = 1024
const ICON_PREVIEW_SIZE = 180
const WEB_LOGO_SIZE = 512
const SPLASH_FAVICON_SCALE = 0.42
const ICON_FAVICON_SCALE = 0.62
const ICON_LOGO_SCALE = 0.62

// Tailwind gray-950 — matches in-app dark theme background
const APP_BG = '#030712'
const GLOW_CENTER = '#141e33'
const GLOW_RADIUS_RATIO = 0.7

function glowSvg(size) {
  const cx = size / 2
  const cy = size / 2
  const r = size * GLOW_RADIUS_RATIO

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="${GLOW_CENTER}" stop-opacity="1"/>
      <stop offset="70%" stop-color="${GLOW_CENTER}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${APP_BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${APP_BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow)"/>
</svg>`
}

/**
 * favicon.png is white mark on opaque black with large internal padding.
 * Extract white pixels and tight-crop so scale refers to the visible mark.
 */
async function loadTightWhiteMark() {
  const faviconBuffer = await fs.readFile(FAVICON)
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

async function buildGlowMarkImage(size, markScale) {
  const targetWidth = Math.round(size * markScale)

  const background = await sharp(Buffer.from(glowSvg(size))).png().toBuffer()

  const markLayer = await loadTightWhiteMark()
    .then((pipeline) =>
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

async function main() {
  await fs.access(FAVICON)

  const splash = await buildGlowMarkImage(SPLASH_SIZE, SPLASH_FAVICON_SCALE)
  const icon = await buildGlowMarkImage(ICON_SIZE, ICON_FAVICON_SCALE)
  const webLogo = await buildGlowMarkImage(WEB_LOGO_SIZE, ICON_LOGO_SCALE)

  const splashFiles = [
    'splash-2732x2732.png',
    'splash-2732x2732-1.png',
    'splash-2732x2732-2.png',
  ]

  for (const name of splashFiles) {
    const dest = path.join(SPLASH_DIR, name)
    await fs.writeFile(dest, splash)
    console.log(`Wrote ${dest}`)
  }

  await fs.writeFile(ICON_PATH, icon)
  console.log(`Wrote ${ICON_PATH}`)

  const preview = await sharp(icon)
    .resize(ICON_PREVIEW_SIZE, ICON_PREVIEW_SIZE)
    .png()
    .toBuffer()
  await fs.writeFile(ICON_PREVIEW_PATH, preview)
  console.log(`Wrote ${ICON_PREVIEW_PATH}`)

  await fs.writeFile(WEB_LOGO_MARK, webLogo)
  console.log(`Wrote ${WEB_LOGO_MARK}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
