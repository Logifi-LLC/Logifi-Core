import type { DigifiImagePart } from './digifiExtractorTypes'

/** Text/image sequence matching Gemini part order: prompt → overview label → overview image → chunk labels/images. */
export type DigifiVisionContentItem =
  | { kind: 'text'; text: string }
  | { kind: 'image'; part: DigifiImagePart }

export function buildVisionContentSequence(
  userPrompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[]
): DigifiVisionContentItem[] {
  const items: DigifiVisionContentItem[] = [
    { kind: 'text', text: userPrompt },
    { kind: 'text', text: overviewImage.label },
    { kind: 'image', part: overviewImage },
  ]
  for (const chunk of chunkImages) {
    items.push({ kind: 'text', text: chunk.label })
    items.push({ kind: 'image', part: chunk })
  }
  return items
}
