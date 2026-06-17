#!/usr/bin/env node
/**
 * Generate iOS splash + app icon from favicon.png:
 * - App icon: coarse gray-950 cross-hatch + favicon pixel remap (hatch replaces black square)
 * - Splash: gray-950 cross-hatch + full favicon composite
 * - Web logo mark: solid gray-950 + white mark (clean at small in-app sizes)
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
const SPLASH_FAVICON_SCALE = 0.36
const ICON_FAVICON_SCALE = 0.55
const ICON_LOGO_SCALE = 0.57

// Tailwind gray-950 — matches in-app dark theme background
const APP_BG = '#030712'
const HATCH_LINE = '#1a2332'
const HATCH_SPACING = 28

// Coarser hatch for home-screen icon (survives iOS downscale to ~60pt)
const ICON_HATCH_SPACING = 32
const ICON_HATCH_LINE = '#243044'
const ICON_HATCH_STROKE = 1.5

function hatchSpacingForSize(size) {
  return Math.max(8, Math.round((HATCH_SPACING * size) / SPLASH_SIZE))
}

function hatchSvg(size, opts = {}) {
  const spacing = opts.spacing ?? hatchSpacingForSize(size)
  const lineColor = opts.lineColor ?? HATCH_LINE
  const strokeWidth = opts.strokeWidth ?? 1

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${APP_BG}"/>
  <defs>
    <pattern id="diagA" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${lineColor}" stroke-width="${strokeWidth}"/>
    </pattern>
    <pattern id="diagB" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${lineColor}" stroke-width="${strokeWidth}"/>
    </pattern>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#diagA)"/>
  <rect width="${size}" height="${size}" fill="url(#diagB)"/>
</svg>`
}

async function renderHatchBuffer(size, opts = {}) {
  return sharp(Buffer.from(hatchSvg(size, opts)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

/** favicon.png is white mark on opaque black; extract white for solid-bg web logo. */
async function loadWhiteMarkFromFavicon() {
  const faviconBuffer = await fs.readFile(FAVICON)
  const { data, info } = await sharp(faviconBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
    data[i + 3] = lum > 64 ? 255 : 0
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
  }

  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
}

/** Full favicon square with black pixels made transparent for hatch compositing. */
async function loadFaviconForComposite() {
  const faviconBuffer = await fs.readFile(FAVICON)
  const { data, info } = await sharp(faviconBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (lum <= 64) {
      data[i + 3] = 0
    }
  }

  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
}

async function buildHatchFaviconImage(size, faviconScale) {
  const faviconWidth = Math.round(size * faviconScale)

  const background = await sharp(Buffer.from(hatchSvg(size))).png().toBuffer()

  const faviconLayer = await loadFaviconForComposite()
    .then((pipeline) =>
      pipeline.resize(faviconWidth, faviconWidth, { fit: 'inside' }).png().toBuffer()
    )

  const { width: fw, height: fh } = await sharp(faviconLayer).metadata()
  const left = Math.round((size - fw) / 2)
  const top = Math.round((size - fh) / 2)

  return sharp(background)
    .composite([{ input: faviconLayer, left, top }])
    .png()
    .toBuffer()
}

/** Home-screen icon: remap favicon dark pixels to hatch background pixels. */
async function buildAppIconImage() {
  const faviconWidth = Math.round(ICON_SIZE * ICON_FAVICON_SCALE)

  const { data: bgData, info: bgInfo } = await renderHatchBuffer(ICON_SIZE, {
    spacing: ICON_HATCH_SPACING,
    lineColor: ICON_HATCH_LINE,
    strokeWidth: ICON_HATCH_STROKE,
  })

  const faviconBuffer = await fs.readFile(FAVICON)
  const { data: favData, info: favInfo } = await sharp(faviconBuffer)
    .resize(faviconWidth, faviconWidth, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const fw = favInfo.width
  const fh = favInfo.height
  const left = Math.round((ICON_SIZE - fw) / 2)
  const top = Math.round((ICON_SIZE - fh) / 2)

  const out = Buffer.from(bgData)
  const canvasWidth = bgInfo.width

  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const fi = (y * fw + x) * 4
      const lum = (favData[fi] + favData[fi + 1] + favData[fi + 2]) / 3
      if (lum > 64) {
        const ox = left + x
        const oy = top + y
        const oi = (oy * canvasWidth + ox) * 4
        out[oi] = 255
        out[oi + 1] = 255
        out[oi + 2] = 255
        out[oi + 3] = 255
      }
    }
  }

  return sharp(out, {
    raw: { width: canvasWidth, height: bgInfo.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

async function buildSolidMarkImage(size, logoScale) {
  const logoWidth = Math.round(size * logoScale)

  const background = await sharp({
    create: { width: size, height: size, channels: 3, background: APP_BG },
  })
    .png()
    .toBuffer()

  const whiteLogo = await loadWhiteMarkFromFavicon()
    .then((pipeline) =>
      pipeline.resize(logoWidth, logoWidth, { fit: 'inside' }).png().toBuffer()
    )

  const { width: lw, height: lh } = await sharp(whiteLogo).metadata()
  const left = Math.round((size - lw) / 2)
  const top = Math.round((size - lh) / 2)

  return sharp(background)
    .composite([{ input: whiteLogo, left, top }])
    .png()
    .toBuffer()
}

async function main() {
  await fs.access(FAVICON)

  const splash = await buildHatchFaviconImage(SPLASH_SIZE, SPLASH_FAVICON_SCALE)
  const icon = await buildAppIconImage()
  const webLogo = await buildSolidMarkImage(WEB_LOGO_SIZE, ICON_LOGO_SCALE)

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
