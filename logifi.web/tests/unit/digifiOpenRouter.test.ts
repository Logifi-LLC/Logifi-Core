import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { DigifiExtractorError } from '../../server/utils/digifiExtractorTypes'
import type { DigifiImagePart } from '../../server/utils/digifiExtractorTypes'
import {
  buildOpenRouterChatRequest,
  collectOpenRouterMessageText,
  extractOpenRouterRows,
  mapOpenRouterUsage,
  OPENROUTER_CHAT_COMPLETIONS_URL,
  postOpenRouterChat,
} from '../../server/utils/digifiOpenRouter'
import { runDigifiScanOrchestration } from '../../server/utils/digifiScanOrchestrator'
import { logDigifiGeminiCallEventSafe } from '../../server/utils/digifiScanEvents'

vi.mock('../../server/utils/digifiScanEvents', () => ({
  logDigifiGeminiCallEventSafe: vi.fn(),
}))

const overviewImage: DigifiImagePart = {
  label: 'Logbook page image:',
  imageBase64: 'pageimg',
  mimeType: 'image/jpeg',
}

const bandImage: DigifiImagePart = {
  label: 'Row band rows 0-0:',
  imageBase64: 'bandimg',
  mimeType: 'image/png',
}

const scanContext = {
  userId: 'user-test',
  scanSessionId: 'scan-test',
  spreadId: '00000000-0000-4000-8000-000000000001',
  pageSide: 'left' as const,
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

describe('buildOpenRouterChatRequest', () => {
  it('sends the prompt and images as data URLs with reasoning effort and no sampling params', () => {
    const body = buildOpenRouterChatRequest(
      'google/gemini-4-hydrogen',
      'Transcribe fictional page.',
      overviewImage,
      [bandImage],
      4096,
      'low',
      ['google-ai-studio']
    )

    expect(body.model).toBe('google/gemini-4-hydrogen')
    expect(body.max_tokens).toBe(4096)
    expect(body.reasoning).toEqual({ effort: 'low', exclude: true })
    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('top_p')
    expect(body.provider).toEqual({ only: ['google-ai-studio'], allow_fallbacks: false })
    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe fictional page.' },
          { type: 'text', text: 'Logbook page image:' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,pageimg' } },
          { type: 'text', text: 'Row band rows 0-0:' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,bandimg' } },
        ],
      },
    ])
  })

  it('uses a configured provider list and skips the pin for non-google models', () => {
    const pinned = buildOpenRouterChatRequest(
      'google/gemini-4-hydrogen',
      'prompt',
      overviewImage,
      [],
      1024,
      'minimal',
      ['google-ai-studio', 'other-studio']
    )
    expect(pinned.reasoning).toEqual({ effort: 'minimal', exclude: true })
    expect(pinned.provider).toEqual({
      only: ['google-ai-studio', 'other-studio'],
      allow_fallbacks: false,
    })

    const unpinned = buildOpenRouterChatRequest(
      'example/fictional-model',
      'prompt',
      overviewImage,
      [],
      1024,
      'low',
      ['google-ai-studio']
    )
    expect(unpinned.provider).toBeUndefined()
  })
})

describe('mapOpenRouterUsage', () => {
  it('maps prompt_tokens and completion_tokens', () => {
    expect(mapOpenRouterUsage({ prompt_tokens: 11, completion_tokens: 3, total_tokens: 14 })).toEqual({
      promptTokens: 11,
      outputTokens: 3,
      totalTokens: 14,
    })
    expect(mapOpenRouterUsage({ prompt_tokens: 5, completion_tokens: 2 })).toEqual({
      promptTokens: 5,
      outputTokens: 2,
      totalTokens: 7,
    })
    expect(mapOpenRouterUsage(undefined)).toEqual({
      promptTokens: null,
      outputTokens: null,
      totalTokens: null,
    })
  })
})

describe('collectOpenRouterMessageText', () => {
  it('reads answer text and ignores reasoning parts', () => {
    expect(
      collectOpenRouterMessageText([
        { type: 'reasoning', text: '0\tdate\t99/99/9999' },
        { type: 'text', text: '0\tdate\t01/02/2024' },
      ])
    ).toBe('0\tdate\t01/02/2024')
  })
})

describe('OpenRouter chat completion', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useRuntimeConfig', () => ({
      openrouterApiKey: '',
      digifiProvider: '',
      digifiOpenrouterModel: '',
      digifiOpenrouterProviders: '',
      geminiApiKey: '',
      anthropicApiKey: '',
      digifiModel: 'gemini-3.8-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
    process.env.NUXT_OPENROUTER_API_KEY = 'test-openrouter-key'
    delete process.env.NUXT_DIGIFI_LOG_RAW_RESPONSE
    delete process.env.DIGIFI_LOG_RAW_RESPONSE
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('posts the pinned request and logs mapped usage from the answer, not reasoning', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        choices: [
          {
            finish_reason: 'stop',
            message: {
              reasoning: '0\tdate\t99/99/9999',
              content: [
                { type: 'reasoning', text: '0\tdate\t99/99/9999' },
                { type: 'text', text: '0\tdate\t01/02/2024' },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 11, completion_tokens: 3, total_tokens: 14 },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const rows = await extractOpenRouterRows(
      'google/gemini-4-hydrogen',
      'Transcribe fictional page.',
      overviewImage,
      [bandImage],
      new Set(['date']),
      1,
      undefined,
      [],
      {
        maxOutputTokens: 4096,
        thinkingLevel: 'low',
        providers: ['google-ai-studio'],
        scanEventContext: scanContext,
      }
    )

    expect(rows).toEqual([{ rowIndex: 0, cells: { date: '01/02/2024' } }])
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }]
    expect(url).toBe(OPENROUTER_CHAT_COMPLETIONS_URL)
    expect(url).not.toContain('test-openrouter-key')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-openrouter-key')
    expect(init.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(init.body)
    expect(body.provider).toEqual({ only: ['google-ai-studio'], allow_fallbacks: false })
    expect(body.reasoning).toEqual({ effort: 'low', exclude: true })
    expect(body.messages[0].content[2].image_url.url).toBe('data:image/jpeg;base64,pageimg')
    expect(logDigifiGeminiCallEventSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'google/gemini-4-hydrogen',
        promptTokens: 11,
        outputTokens: 3,
        totalTokens: 14,
        status: 'ok',
      })
    )
  })

  it('strips newlines from the bearer token', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { choices: [], usage: {} }))
    vi.stubGlobal('fetch', fetchMock)
    await postOpenRouterChat('test-openrouter-key\r\nX-Evil: 1', buildOpenRouterChatRequest(
      'example/fictional-model',
      'prompt',
      overviewImage,
      [],
      128,
      'low',
      []
    ))
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> }
    expect(init.headers.Authorization).toBe('Bearer test-openrouter-keyX-Evil: 1')
    expect(init.headers.Authorization).not.toMatch(/[\r\n]/)
  })

  it('redacts the key from a failed response and does not retry a 401', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'bad key test-openrouter-key',
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      extractOpenRouterRows(
        'google/gemini-4-hydrogen',
        'prompt',
        overviewImage,
        [],
        new Set(['date']),
        1,
        undefined,
        [],
        { maxOutputTokens: 128, thinkingLevel: 'low', providers: ['google-ai-studio'] }
      )
    ).rejects.toMatchObject({ code: 'CONFIG' })

    expect(fetchMock).toHaveBeenCalledOnce()
    await expect(
      extractOpenRouterRows(
        'google/gemini-4-hydrogen',
        'prompt',
        overviewImage,
        [],
        new Set(['date']),
        1,
        undefined,
        [],
        { maxOutputTokens: 128, thinkingLevel: 'low', providers: ['google-ai-studio'] }
      )
    ).rejects.toThrow(/\[redacted\]/)
  })
})

describe('OpenRouter capacity errors reach the Gemini fallback', () => {
  const originalEnv = { ...process.env }
  const meta = {
    spreadId: '00000000-0000-4000-8000-000000000001',
    pageSide: 'left' as const,
    layout: 'single' as const,
    rowCount: 5,
    twoPageSplitIndex: 1,
    defaultYear: 2024,
    columns: [{ id: 'date', label: 'Date', fieldKey: 'date' as const, order: 0 }],
  }

  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      geminiApiKey: '',
      anthropicApiKey: '',
      openrouterApiKey: '',
      digifiProvider: '',
      digifiModel: 'gemini-3.8-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
    process.env.NUXT_DIGIFI_ENABLE_RESCUE_SCAN = 'false'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  const baseOptions = {
    meta,
    targetColumns: meta.columns,
    chunkImages: [],
    overviewImage,
    labeledChunks: [],
    providerUsed: 'openrouter' as const,
    logLabel: 'openrouter chat completions',
    modelChain: ['google/gemini-4-hydrogen'],
  }

  it('rethrows a capacity error when there is no alternate model', async () => {
    const callRows = vi.fn(async () => {
      throw new DigifiExtractorError('busy', 'CAPACITY', ['google/gemini-4-hydrogen'])
    })
    await expect(
      runDigifiScanOrchestration({
        ...baseOptions,
        rethrowIfNoModelFallback: true,
        callRows,
      })
    ).rejects.toMatchObject({ code: 'CAPACITY' })
    expect(callRows).toHaveBeenCalledTimes(1)
  })

  it('keeps the primary result when rethrow is off and no alternate model runs', async () => {
    const callRows = vi.fn(async () => {
      throw new DigifiExtractorError('busy', 'CAPACITY', ['gemini-3.8-flash'])
    })
    const result = await runDigifiScanOrchestration({
      ...baseOptions,
      providerUsed: 'gemini',
      modelChain: ['gemini-3.8-flash'],
      callRows,
    })
    expect(callRows).toHaveBeenCalledTimes(1)
    expect(result.rows).toEqual([])
    expect(result.providerUsed).toBe('gemini')
  })
})
