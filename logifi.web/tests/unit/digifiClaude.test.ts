import { describe, it, expect } from 'vitest'
import { buildClaudeMessages, buildClaudeSystemPrompt } from '../../server/utils/digifiClaude'
import { TSV_FORMAT_RULES } from '../../server/utils/digifiPrompt'
import type { DigifiImagePart } from '../../server/utils/digifiExtractorTypes'
import { buildVisionContentSequence } from '../../server/utils/digifiVisionPayload'

describe('buildClaudeSystemPrompt', () => {
  it('is role-only without TSV rules (Gemini parity — TSV lives in user prompt)', () => {
    const prompt = buildClaudeSystemPrompt()
    expect(prompt).toContain('transcribing handwritten pilot logbook')
    expect(prompt).not.toContain('rowIndex<TAB>columnId<TAB>value')
  })
})

describe('buildVisionContentSequence', () => {
  it('matches Gemini part order: prompt, label, image, chunk labels/images', () => {
    const overview: DigifiImagePart = {
      label: 'Logbook page image:',
      imageBase64: 'abc',
      mimeType: 'image/jpeg',
    }
    const chunk: DigifiImagePart = {
      label: 'Row band rows 0-4:',
      imageBase64: 'def',
      mimeType: 'image/jpeg',
    }
    const seq = buildVisionContentSequence('Transcribe page.', overview, [chunk])
    expect(seq).toEqual([
      { kind: 'text', text: 'Transcribe page.' },
      { kind: 'text', text: 'Logbook page image:' },
      { kind: 'image', part: overview },
      { kind: 'text', text: 'Row band rows 0-4:' },
      { kind: 'image', part: chunk },
    ])
  })
})

describe('buildClaudeMessages', () => {
  const overviewImage: DigifiImagePart = {
    label: 'Logbook page image:',
    imageBase64: 'abc123',
    mimeType: 'image/jpeg',
  }

  const chunkImage: DigifiImagePart = {
    label: 'Row band rows 0-4:',
    imageBase64: 'def456',
    mimeType: 'image/jpeg',
  }

  const defaultOptions = {
    temperature: 0,
    enableThinking: false,
    thinkingBudgetTokens: 2048,
  }

  it('packages role-only system, user prompt with images, temperature 0', () => {
    const userPrompt = `Transcribe this pilot logbook page.\n\n${TSV_FORMAT_RULES}`
    const body = buildClaudeMessages(
      'claude-sonnet-4-6',
      userPrompt,
      overviewImage,
      [chunkImage],
      8192,
      defaultOptions
    )

    expect(body.model).toBe('claude-sonnet-4-6')
    expect(body.max_tokens).toBe(8192)
    expect(body.temperature).toBe(0)
    expect(body.system).not.toContain('rowIndex<TAB>columnId<TAB>value')
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].role).toBe('user')

    const content = body.messages[0].content
    expect(content[0]).toEqual({ type: 'text', text: userPrompt })
    expect(content[1]).toEqual({ type: 'text', text: 'Logbook page image:' })
    expect(content[2]).toEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: 'abc123',
      },
    })
    expect(content[3]).toEqual({ type: 'text', text: 'Row band rows 0-4:' })
    expect(content[4]).toEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: 'def456',
      },
    })
    expect(body.thinking).toBeUndefined()
  })

  it('includes thinking block when enabled', () => {
    const body = buildClaudeMessages(
      'claude-sonnet-4-6',
      'prompt',
      overviewImage,
      [],
      8192,
      { ...defaultOptions, enableThinking: true, thinkingBudgetTokens: 1024 }
    )
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 1024 })
  })

  it('maps png and webp mime types', () => {
    const body = buildClaudeMessages(
      'claude-sonnet-4-6',
      'user',
      { label: 'img', imageBase64: 'x', mimeType: 'image/png' },
      [{ label: 'chunk', imageBase64: 'y', mimeType: 'image/webp' }],
      4096,
      defaultOptions
    )
    const images = body.messages[0].content.filter((block) => block.type === 'image')
    expect(images[0].source.media_type).toBe('image/png')
    expect(images[1].source.media_type).toBe('image/webp')
  })
})
