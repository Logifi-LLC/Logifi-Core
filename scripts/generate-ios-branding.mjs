#!/usr/bin/env node
/**
 * Generate iOS splash + app icon from favicon.png:
 * - App icon + web logo mark: solid gray-950 (#030712) + white mark
 * - Splash: gray-950 with diamond cross-hatch texture + white mark
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
const ICON_PATH = path.join(
  ROOT,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
)
const WEB_LOGO_MARK = path.join(ROOT, 'logifi.web/public/images/app-logo-mark.png')

const SPLASH_SIZE = 2732
const ICON_SIZE = 1024
const WEB_LOGO_SIZE = 512
const SPLASH_LOGO_SCALE = 0.3
const ICON_LOGO_SCALE = 0.57

// Tailwind gray-950 — matches in-app dark theme background
const APP_BG = '#030712'
const HATCH_LINE = '#1a2332'
const HATCH_SPACING = 28

function hatchSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${APP_BG}"/>
  <defs>
    <pattern id="diagA" width="${HATCH_SPACING}" height="${HATCH_SPACING}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="${HATCH_SPACING}" stroke="${HATCH_LINE}" stroke-width="1"/>
    </pattern>
    <pattern id="diagB" width="${HATCH_SPACING}" height="${HATCH_SPACING}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <line x1="0" y1="0" x2="0" y2="${HATCH_SPACING}" stroke="${HATCH_LINE}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#diagA)"/>
  <rect width="${size}" height="${size}" fill="url(#diagB)"/>
</svg>`
}

/** favicon.png is white mark on opaque black; extract white for compositing on hatch bg. */
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

async function buildBrandedImage(size, logoScale, { hatch = true } = {}) {
  const logoWidth = Math.round(size * logoScale)

  const background = hatch
    ? await sharp(Buffer.from(hatchSvg(size))).png().toBuffer()
    : await sharp({
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

  const splash = await buildBrandedImage(SPLASH_SIZE, SPLASH_LOGO_SCALE, { hatch: true })
  const icon = await buildBrandedImage(ICON_SIZE, ICON_LOGO_SCALE, { hatch: false })
  const webLogo = await buildBrandedImage(WEB_LOGO_SIZE, ICON_LOGO_SCALE, { hatch: false })

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

  await fs.writeFile(WEB_LOGO_MARK, webLogo)
  console.log(`Wrote ${WEB_LOGO_MARK}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
