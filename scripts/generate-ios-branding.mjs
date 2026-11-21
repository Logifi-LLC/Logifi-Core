#!/usr/bin/env node
/**
 * Generate iOS splash + app icon from favicon.png:
 * - Splash: 72pt propeller first frame (the HTML boot mark), not a scaled favicon
 * - App icon: gray-950 radial glow + white mark composite
 *
 * Usage: npm run generate:ios-branding
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'

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

const ICON_SIZE = 1024
const ICON_PREVIEW_SIZE = 180
const WEB_LOGO_SIZE = 512
/**
 * `.loading-animation__mark--md` is 72 CSS px. In WKWebView that is 72pt.
 * The launch image is the propeller SVG's first frame at that size, not a
 * tight crop aspect-filled across a 2732 canvas (that drew the mark at 63×72pt
 * on a 390×844 phone, against a 39.5×44.6pt ink inside the 72px SVG).
 */
const SPLASH_MARK_PT = 72
const SPLASH_FILES = [
  { name: 'splash-mark.png', scale: 1 },
  { name: 'splash-mark@2x.png', scale: 2 },
  { name: 'splash-mark@3x.png', scale: 3 },
]
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

async function buildFlatMarkImage(size, markScale) {
  const targetWidth = Math.round(size * markScale)

  const background = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: APP_BG,
    },
  })
    .png()
    .toBuffer()

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

/** First frame of the boot propeller. Paths match app.html. */
function propellerFirstFrameSvg(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${APP_BG}"/>
  <path d="M116 207.5H142V389.5H323V415H116Z" fill="#FFFFFF"/>
  <path d="M190.5 98H397V306H372V124H190.5Z" fill="#FFFFFF"/>
</svg>`
}

function resolvePlaywrightCore() {
  const pnpm = path.join(ROOT, 'logifi.web/node_modules/.pnpm')
  let entries
  try {
    entries = fsSync.readdirSync(pnpm)
  } catch {
    return null
  }
  const hit = entries.find((name) => name.startsWith('playwright-core@'))
  if (!hit) return null
  return path.join(pnpm, hit, 'node_modules/playwright-core/index.js')
}

/**
 * WKWebView paints this SVG on the phone. librsvg (sharp) strokes the half-pixel
 * edges heavier, so the launch image is rasterized with WebKit when it is installed.
 */
async function renderPropellerFrames(scales) {
  const webkitPath = resolvePlaywrightCore()
  let browser = null
  if (webkitPath) {
    try {
      browser = await require(webkitPath).webkit.launch()
    } catch (error) {
      console.warn(`WebKit splash render failed (${error instanceof Error ? error.message : error}); using sharp`)
    }
  }

  const frames = []
  try {
    for (const scale of scales) {
      const px = SPLASH_MARK_PT * scale
      const svg = propellerFirstFrameSvg(px)
      if (!browser) {
        frames.push(await sharp(Buffer.from(svg)).png().toBuffer())
        continue
      }
      const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 })
      await page.setContent(
        `<!doctype html><html><body style="margin:0;background:${APP_BG}">${svg}</body></html>`,
        { waitUntil: 'load' },
      )
      const shot = await page.locator('svg').screenshot({ type: 'png' })
      await page.close()
      frames.push(await sharp(shot).flatten({ background: APP_BG }).png().toBuffer())
    }
  } finally {
    await browser?.close()
  }
  return frames
}

async function buildGlowMarkImage(size, markScale) {
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

async function main() {
  await fs.access(FAVICON)

  const icon = await buildGlowMarkImage(ICON_SIZE, ICON_FAVICON_SCALE)
  const webLogo = await buildFlatMarkImage(WEB_LOGO_SIZE, ICON_LOGO_SCALE)

  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await fs.rm(path.join(SPLASH_DIR, name), { force: true })
  }

  const frames = await renderPropellerFrames(SPLASH_FILES.map((file) => file.scale))
  for (let i = 0; i < SPLASH_FILES.length; i++) {
    const file = SPLASH_FILES[i]
    const dest = path.join(SPLASH_DIR, file.name)
    await fs.writeFile(dest, frames[i])
    console.log(`Wrote ${dest} (${SPLASH_MARK_PT * file.scale}x${SPLASH_MARK_PT * file.scale})`)
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