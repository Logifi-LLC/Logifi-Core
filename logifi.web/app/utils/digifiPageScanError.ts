import type { DigifiPageSide } from './digifiTypes'

/** User-facing copy when a page photo could not be read. */
export function digifiPageReadError(
  side: DigifiPageSide,
  layout: 'single' | 'two-page' = 'two-page'
): string {
  if (layout !== 'two-page') {
    return "This page couldn't be read. Retake the photo."
  }
  const title = side === 'left' ? 'Left' : 'Right'
  return `${title} page couldn't be read. Retake the ${side} page.`
}
