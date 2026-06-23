import { ref } from 'vue'
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

export function useDigifiQrScanner() {
  const scanning = ref(false)
  const scanError = ref<string | null>(null)

  async function scanQrCode(): Promise<string | null> {
    if (!isCapacitorNative()) {
      scanError.value = 'QR scanning is only available inside the iOS app.'
      return null
    }

    scanning.value = true
    scanError.value = null
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Scan the Digifi capture QR code from your computer.',
      })
      const value = result.ScanResult?.trim()
      if (!value) {
        scanError.value = 'No QR code result returned.'
        return null
      }
      return value
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'QR scanning failed.'
      if (/cancel/i.test(message)) return null
      scanError.value = message
      return null
    } finally {
      scanning.value = false
    }
  }

  return {
    scanQrCode,
    scanning,
    scanError,
  }
}
