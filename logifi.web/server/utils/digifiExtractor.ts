import { getDigifiEnv, inferDigifiProvider } from './digifiEnv'
import type { DigifiScanResult, ScanLogbookImageOptions } from './digifiExtractorTypes'
import { scanLogbookImageWithClaude } from './digifiClaude'
import { scanLogbookImageWithGemini } from './digifiGemini'
import { scanLogbookImageWithOpenRouter } from './digifiOpenRouter'

function redactSecret(text: string, secret: string): string {
  if (!secret) return text
  return text.split(secret).join('[redacted]')
}

function logOpenRouterFallback(reason: string): void {
  console.warn(`[digifi] OpenRouter unavailable (${reason}); falling back to Gemini`)
}

async function scanWithGeminiAfterOpenRouter(
  options: ScanLogbookImageOptions,
  openrouterModel: string,
  attemptedOpenRouter: boolean
): Promise<DigifiScanResult> {
  const result = await scanLogbookImageWithGemini(options)
  if (!attemptedOpenRouter) {
    return { ...result, fallbackUsed: true }
  }
  const modelsAttempted = result.modelsAttempted.filter((model) => model !== openrouterModel)
  return {
    ...result,
    fallbackUsed: true,
    modelsAttempted: [openrouterModel, ...modelsAttempted],
  }
}

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

  if (env.transport === 'openrouter') {
    if (!env.openrouterApiKey) {
      logOpenRouterFallback('API key missing')
      return scanWithGeminiAfterOpenRouter(options, env.openrouterModel, false)
    }
    try {
      return await scanLogbookImageWithOpenRouter(options)
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'request failed'
      logOpenRouterFallback(redactSecret(raw, env.openrouterApiKey).slice(0, 200))
      return scanWithGeminiAfterOpenRouter(options, env.openrouterModel, true)
    }
  }

  if (!env.geminiApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }
  return scanLogbookImageWithGemini(options)
}
