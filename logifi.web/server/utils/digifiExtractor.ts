import { getDigifiEnv, inferDigifiProvider } from './digifiEnv'
import type { DigifiScanResult, ScanLogbookImageOptions } from './digifiExtractorTypes'
import { scanLogbookImageWithClaude } from './digifiClaude'
import { scanLogbookImageWithGemini } from './digifiGemini'

export async function scanLogbookImage(
  options: ScanLogbookImageOptions
): Promise<DigifiScanResult> {
  const env = getDigifiEnv()
  const provider = inferDigifiProvider(env.model)
  if (provider === 'anthropic') {
    if (!env.anthropicApiKey) {
      throw new Error('DIGIFI_NOT_CONFIGURED')
    }
    return scanLogbookImageWithClaude(options)
  }
  if (!env.geminiApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }
  return scanLogbookImageWithGemini(options)
}
