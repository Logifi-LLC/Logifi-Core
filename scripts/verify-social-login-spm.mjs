#!/usr/bin/env node
/**
 * CI guard: iOS SPM must not resolve Facebook/Google for Social Login when providers are disabled.
 * Usage: npm run verify:social-login-spm
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const pluginPackageSwift = path.join(
  repoRoot,
  'node_modules/@capgo/capacitor-social-login/Package.swift'
)
const packageResolved = path.join(
  repoRoot,
  'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'
)

function fail(message) {
  console.error(`[verify-social-login-spm] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(pluginPackageSwift)) {
  console.warn('[verify-social-login-spm] Plugin not installed; skipping.')
  process.exit(0)
}

const swift = fs.readFileSync(pluginPackageSwift, 'utf8')
if (swift.includes('facebook-ios-sdk') || swift.includes('FacebookCore')) {
  fail('Package.swift still references Facebook SDK. Run: node scripts/configure-social-login-spm.mjs')
}
if (swift.includes('GoogleSignIn-iOS') || swift.includes('GoogleSignIn')) {
  fail('Package.swift still references Google Sign-In. Run: node scripts/configure-social-login-spm.mjs')
}

if (fs.existsSync(packageResolved)) {
  const resolved = fs.readFileSync(packageResolved, 'utf8')
  if (resolved.includes('facebook-ios-sdk')) {
    fail(
      'Package.resolved still pins facebook-ios-sdk. Open the iOS project in Xcode (or run swift package resolve) after configure-social-login-spm.'
    )
  }
}

console.log('[verify-social-login-spm] OK — Apple-only Social Login SPM config.')
