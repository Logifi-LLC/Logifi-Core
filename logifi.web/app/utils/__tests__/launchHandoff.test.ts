import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(process.cwd(), '..')
const storyboard = readFileSync(
  path.join(root, 'ios/App/App/Base.lproj/LaunchScreen.storyboard'),
  'utf8',
)
const branding = readFileSync(path.join(root, 'scripts/generate-ios-branding.mjs'), 'utf8')
const appHtml = readFileSync(path.resolve(process.cwd(), 'app.html'), 'utf8')

function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('iOS launch mark matches the 72px propeller', () => {
  it('centers a 72pt image on #030712 instead of aspect-filling a square canvas', () => {
    expect(storyboard).toContain('contentMode="scaleAspectFit"')
    expect(storyboard).not.toContain('scaleAspectFill')
    expect(storyboard).toContain('constant="72" id="mark-w"')
    expect(storyboard).toContain('constant="72" id="mark-h"')
    expect(storyboard).toContain('firstAttribute="centerX"')
    expect(storyboard).toContain('firstAttribute="centerY"')
    expect(storyboard).toContain('red="0.011764705882352941" green="0.027450980392156862" blue="0.07058823529411765"')
    expect(storyboard).toContain('<image name="Splash" width="72" height="72"/>')
  })

  it('uses the propeller first-frame paths at 72, 144, and 216 pixels', () => {
    const bl = 'M116 207.5H142V389.5H323V415H116Z'
    const tr = 'M190.5 98H397V306H372V124H190.5Z'
    expect(appHtml).toContain(bl)
    expect(appHtml).toContain(tr)
    expect(branding).toContain(bl)
    expect(branding).toContain(tr)
    const dir = path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset')
    expect(pngSize(path.join(dir, 'splash-mark.png'))).toEqual({ width: 72, height: 72 })
    expect(pngSize(path.join(dir, 'splash-mark@2x.png'))).toEqual({ width: 144, height: 144 })
    expect(pngSize(path.join(dir, 'splash-mark@3x.png'))).toEqual({ width: 216, height: 216 })
  })
})
