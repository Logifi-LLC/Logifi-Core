import { describe, it, expect } from 'vitest'
import { buildVisionContentSequence } from '../../server/utils/digifiVisionPayload'
import type { DigifiImagePart } from '../../server/utils/digifiExtractorTypes'

describe('buildVisionContentSequence', () => {
  it('orders text before each image like Gemini inline_data parts', () => {
    const overview: DigifiImagePart = {
      label: 'Logbook page image:',
      imageBase64: 'page',
      mimeType: 'image/jpeg',
    }
    const chunk: DigifiImagePart = {
      label: 'Row band rows 2-5:',
      imageBase64: 'band',
      mimeType: 'image/jpeg',
    }

    expect(buildVisionContentSequence('full prompt text', overview, [chunk])).toEqual([
      { kind: 'text', text: 'full prompt text' },
      { kind: 'text', text: 'Logbook page image:' },
      { kind: 'image', part: overview },
      { kind: 'text', text: 'Row band rows 2-5:' },
      { kind: 'image', part: chunk },
    ])
  })
})
