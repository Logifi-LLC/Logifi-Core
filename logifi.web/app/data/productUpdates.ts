/**
 * In-app product changelog. Add a new entry (newest first) when shipping features.
 * Dashboard teaser and Settings → Updates both read from this list.
 */
export type ProductUpdate = {
  id: string
  date: string
  title: string
  /** Short line under the title (e.g. "Paper logbook scanning") */
  tagline?: string
  summary: string
  bullets: string[]
}

export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    id: '2026-06-digifi',
    date: '2026-06-03',
    title: 'Digifi',
    tagline: 'Paper logbook scanning',
    summary: 'Scan handwritten logbook spreads with your phone or camera and import into your digital logbook.',
    bullets: [
      'Upload photos of left and right logbook pages; AI transcribes entries for you to review and edit.',
      'Pay-per-spread credits—1 credit covers one full spread (left + right pages).',
      'Mobile capture link lets you photograph pages on your phone and finish on desktop.',
    ],
  },
  {
    id: '2026-05-add-pages',
    date: '2026-05-15',
    title: 'Add pages — multi-page logbook spreads',
    summary: 'Build custom logbook pages with flexible layouts for printing and import.',
    bullets: [
      'Add rows, choose columns, and use two-page layout for left/right printing.',
      'Import scanned or typed entries into your main logbook when ready.',
    ],
  },
  {
    id: '2026-04-dashboard-ui',
    date: '2026-04-01',
    title: 'Upgraded dashboard UI',
    summary: 'Refined dashboard experience across light and dark mode.',
    bullets: [
      'Cleaner totals overview and logbook section styling.',
      'Improved readability and contrast in both themes.',
    ],
  },
]

export function formatProductUpdateDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
