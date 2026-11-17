/** Dev-only: fictional CFI screenshots → /opt/cursor/artifacts. Not run in CI. */
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ARTIFACTS = '/opt/cursor/artifacts'
const SIGNED_LINE =
  '11/17/2026  /s/ Alex Instructor  1234567CFI  Exp. 12/31/2027'

async function writeFictionalInkPng(browser) {
  const page = await browser.newPage()
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 520
    canvas.height = 140
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2.8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(28, 88)
    ctx.bezierCurveTo(72, 32, 128, 112, 168, 62)
    ctx.bezierCurveTo(208, 28, 248, 98, 300, 54)
    ctx.bezierCurveTo(340, 36, 400, 78, 468, 48)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(32, 108)
    ctx.lineTo(120, 108)
    ctx.stroke()
    return canvas.toDataURL('image/png')
  })
  await page.close()
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  const pngPath = path.join(ARTIFACTS, 'fictional-signature-ink.png')
  fs.writeFileSync(pngPath, Buffer.from(b64, 'base64'))
  return { pngPath, dataUrl }
}

function shellHtml(bodyInner, isDark) {
  const bg = isDark ? '#111827' : '#f3f4f6'
  const panel = isDark
    ? 'background:#1f2937;border-color:#374151;color:#e5e7eb'
    : 'background:#ffffff;border-color:#e5e7eb;color:#111827'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    body { font-family: Quicksand, system-ui, sans-serif; margin: 0; background: ${bg}; }
    .panel { max-width: 42rem; margin: 2rem auto; border-radius: 1rem; border: 1px solid;
      padding: 1.25rem 1.5rem 1.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.08); ${panel}; }
    .ink-img { display: block; height: 7rem; width: auto; max-width: 100%; object-fit: contain; object-position: left; }
    .ink-img.dark-ink { filter: invert(1); }
  </style>
</head>
<body>
  <div class="panel" data-testid="fixture-panel">
    ${bodyInner}
  </div>
</body>
</html>`
}

function signedBlockBody(isDark) {
  const textClass = isDark ? 'text-green-200' : 'text-green-800'
  const imgClass = isDark ? 'ink-img dark-ink' : 'ink-img'
  return `
    <p class="text-xs uppercase font-bold text-gray-500 mb-3">Edit entry — fictional preview</p>
    <div class="rounded border px-3 py-2 text-sm mb-4 ${isDark ? 'border-green-700/60 bg-green-900/20 text-green-200' : 'border-green-200 bg-green-50 text-green-800'}">
      Signed by instructor — this entry cannot be edited or deleted.
    </div>
    <div class="opacity-80 pointer-events-none text-sm text-gray-500 py-2">…flight fields (omitted)…</div>
    <div class="space-y-2 pt-2 text-sm ${textClass}">
      <p class="font-medium">${SIGNED_LINE}</p>
      <div class="min-h-[4.5rem]">
        <img class="${imgClass}" id="ink-preview" alt="Instructor signature" />
      </div>
    </div>
    <div class="flex items-center justify-between mt-2 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
      <button type="button" class="text-xs font-semibold px-3 py-1.5 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-gray-100'}">View History</button>
      <div class="flex gap-3">
        <button type="button" class="px-4 py-2 rounded-lg text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}">Close</button>
      </div>
    </div>`
}

function pendingBlockBody(isDark) {
  const card = isDark
    ? 'border-gray-600 bg-gray-800/50'
    : 'border-gray-200 bg-gray-50'
  return `
    <p class="text-xs uppercase font-bold text-gray-500 mb-3">Edit entry — fictional preview</p>
    <div class="opacity-80 text-sm text-gray-500 py-2 mb-2">…dual received set; fields above omitted…</div>
    <div class="rounded-lg border p-3 space-y-3 ${card}">
      <p class="text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}">Instructor signature</p>
      <p class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">Dual Received time is set. Sign now on this device, or request a signature from a linked instructor.</p>
      <label class="block text-sm"><span class="${isDark ? 'text-gray-300' : 'text-gray-700'}">Instructor</span>
        <select class="mt-1 w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}">
          <option>Guest / fill-in instructor</option>
        </select>
      </label>
      <div class="grid gap-2 sm:grid-cols-2 text-sm">
        <input placeholder="Instructor name" value="Pat Example" class="rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'}"/>
        <input placeholder="Certificate #" value="0000000CFI" class="rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'}"/>
      </div>
      <div class="block">
        <span class="block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}">Signature</span>
        <div class="h-28 rounded-lg border border-dashed ${isDark ? 'border-gray-600 bg-gray-900/40' : 'border-gray-300 bg-white'} flex items-center justify-center text-xs text-gray-400">Signature pad</div>
      </div>
      <button type="button" class="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold border ${isDark ? 'border-cyan-700/60 bg-cyan-900/30 text-cyan-100' : 'border-cyan-300 bg-cyan-50 text-cyan-900'}">Sign on phone (QR)</button>
    </div>
    <div class="flex items-center justify-between mt-2 pt-4 border-t border-gray-200">
      <button type="button" class="text-xs text-red-500">Delete Entry</button>
      <div class="flex gap-3">
        <button type="button" class="px-4 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
        <button type="button" class="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white">Save</button>
      </div>
    </div>`
}

async function screenshotHtml(page, html, outPath, width, inkDataUrl, height = 900, waitInk = true) {
  await page.setViewportSize({ width, height })
  await page.setContent(html, { waitUntil: 'networkidle' })
  if (waitInk && inkDataUrl) {
    await page.evaluate((url) => {
      const img = document.getElementById('ink-preview')
      if (img) img.setAttribute('src', url)
    }, inkDataUrl)
    await page.waitForFunction(() => {
      const img = document.getElementById('ink-preview')
      return img instanceof HTMLImageElement && img.naturalWidth > 0
    })
  }
  await page.locator('[data-testid="fixture-panel"]').screenshot({ path: outPath })
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch()
  const { dataUrl: inkUrl } = await writeFictionalInkPng(browser)

  const page = await browser.newPage()

  await screenshotHtml(
    page,
    shellHtml(signedBlockBody(false), false),
    path.join(ARTIFACTS, 'signed-entry-block-1440-light.png'),
    1440,
    inkUrl
  )

  await screenshotHtml(
    page,
    shellHtml(signedBlockBody(true), true),
    path.join(ARTIFACTS, 'signed-entry-block-1440-dark.png'),
    1440,
    inkUrl
  )

  await screenshotHtml(
    page,
    shellHtml(signedBlockBody(false), false),
    path.join(ARTIFACTS, 'signed-entry-block-390-light.png'),
    390,
    inkUrl,
    820
  )

  await screenshotHtml(
    page,
    shellHtml(pendingBlockBody(false), false),
    path.join(ARTIFACTS, 'pending-signature-block-1440-light.png'),
    1440,
    null,
    900,
    false
  )

  await browser.close()
  console.log('Wrote screenshots to', ARTIFACTS)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})