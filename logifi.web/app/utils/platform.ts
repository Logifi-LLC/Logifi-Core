import { Capacitor } from '@capacitor/core'

/**
 * Platform detection utilities for Capacitor apps
 */

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web'
}

/**
 * Returns true if running in iOS native app where IAP is required for digital goods.
 * Use this to gate Stripe/Lightning checkout UI on iOS.
 */
export function isIosApp(): boolean {
  return isIOS()
}

/**
 * Returns true if web-based payment methods (Stripe/Lightning) should be shown.
 * False on iOS where only IAP is allowed for digital goods per App Store guidelines.
 */
export function canUseWebPayments(): boolean {
  return !isIosApp()
}
