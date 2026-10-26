#!/usr/bin/env node
/**
 * Logifi iOS uses SPM (CapApp-SPM), not CocoaPods. @capgo/capacitor-social-login's
 * capacitor:sync hook only trims the podspec; the default Package.swift still pulls
 * Facebook and Google SDKs. Those frameworks can initialize at dyld time and crash
 * on cold launch (e.g. FBLoginButton on iOS 27) even when the app only uses Apple Sign In.
 *
 * When SocialLogin.providers disables facebook/google in capacitor.config.json, copy the
 * Apple-only Package.swift template into the installed plugin before Xcode resolves SPM.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const configPath = path.join(repoRoot, 'capacitor.config.json')
const pluginPackageSwift = path.join(
  repoRoot,
  'node_modules/@capgo/capacitor-social-login/Package.swift'
)
const templatePath = path.join(__dirname, 'templates/social-login-Package.apple-only.swift')

function readProviders() {
  const defaults = { google: true, facebook: true, apple: true, twitter: true }
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(raw)
    const providers = config?.plugins?.SocialLogin?.providers
    if (!providers || typeof providers !== 'object') return defaults
    return { ...defaults, ...providers }
  } catch {
    return defaults
  }
}

function providerEnabled(value) {
  if (value === false || value === 'false') return false
  return true
}

function main() {
  const providers = readProviders()
  const needsAppleOnlySpm =
    !providerEnabled(providers.facebook) && !providerEnabled(providers.google)

  if (!needsAppleOnlySpm) {
    console.log(
      '[configure-social-login-spm] Facebook or Google enabled in config; leaving vendor Package.swift unchanged.'
    )
    return
  }

  if (!fs.existsSync(pluginPackageSwift)) {
    console.warn(
      `[configure-social-login-spm] Plugin not installed at ${pluginPackageSwift}; skip (run npm install).`
    )
    return
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing template: ${templatePath}`)
  }

  const template = fs.readFileSync(templatePath, 'utf8')
  fs.writeFileSync(pluginPackageSwift, template, 'utf8')
  console.log(
    '[configure-social-login-spm] Wrote Apple-only Package.swift for @capgo/capacitor-social-login (no FBSDK / GoogleSignIn).'
  )
}

main()
