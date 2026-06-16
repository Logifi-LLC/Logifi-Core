import { getDigifiEnv } from './digifiEnv'
import type { DigifiProvider } from './digifiExtractorTypes'

export function logDigifiRawExtractResponse(
  provider: DigifiProvider,
  model: string,
  text: string,
  maxRowCount: number,
  parsedRowCount: number
): void {
  if (!getDigifiEnv().logRawResponse) return
  console.info('[digifi] raw extract response', {
    provider,
    model,
    textLength: text.length,
    preview: text.slice(0, 500),
    parsedRowCount,
    expectedRowCount: maxRowCount,
  })
}
