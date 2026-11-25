/**
 * Airline transport pilot aeronautical experience (airplane category).
 * Display-only constants; log totals are compared elsewhere.
 *
 * 14 CFR 61.160 reduces total time only for eligible R-ATP pathways; other
 * 61.159(a) experience minimums still apply unless 61.160 states otherwise.
 */

export type AtpTrackId = 'atp' | 'ratp_1000' | 'ratp_1250'

export interface AtpRequirementRow {
  key: string
  label: string
  /** Hours unless noted in label. */
  requiredHours: number
  /** Short citation for maintainers; not shown as a legal summary. */
  regulation: string
}

export interface AtpTotalRequirement {
  track: AtpTrackId
  label: string
  requiredHours: number
  regulation: string
}

/** Shared 61.159(a) minimums after total time (same for ATP and R-ATP tracks). */
export const ATP_SHARED_EXPERIENCE_REQUIREMENTS: AtpRequirementRow[] = [
  {
    key: 'crossCountry',
    label: 'Cross-country',
    requiredHours: 500,
    regulation: '14 CFR 61.159(a)(1)',
  },
  { key: 'night', label: 'Night', requiredHours: 100, regulation: '14 CFR 61.159(a)(2)' },
  {
    key: 'multiEngine',
    label: 'Class (multi-engine)',
    requiredHours: 50,
    regulation: '14 CFR 61.159(a)(3)',
  },
  {
    key: 'instrument',
    label: 'Instrument',
    requiredHours: 75,
    regulation: '14 CFR 61.159(a)(4)',
  },
  { key: 'pic', label: 'PIC', requiredHours: 250, regulation: '14 CFR 61.159(a)(5)' },
  {
    key: 'picCrossCountry',
    label: 'PIC cross-country',
    requiredHours: 100,
    regulation: '14 CFR 61.159(a)(5)',
  },
  {
    key: 'picNight',
    label: 'PIC night',
    requiredHours: 25,
    regulation: '14 CFR 61.159(a)(5)',
  },
]

export const ATP_TOTAL_BY_TRACK: Record<AtpTrackId, AtpTotalRequirement> = {
  atp: {
    track: 'atp',
    label: 'Total time',
    requiredHours: 1500,
    regulation: '14 CFR 61.159(a)',
  },
  ratp_1000: {
    track: 'ratp_1000',
    label: 'Total time',
    requiredHours: 1000,
    regulation: '14 CFR 61.160(a)(1)',
  },
  ratp_1250: {
    track: 'ratp_1250',
    label: 'Total time',
    requiredHours: 1250,
    regulation: '14 CFR 61.160(b)(1)',
  },
}

/** 61.160 military 750-hour pathway not modeled in the track toggle (omit bar). */

export function requirementsForAtpTrack(track: AtpTrackId): AtpRequirementRow[] {
  const total = ATP_TOTAL_BY_TRACK[track]
  return [
    {
      key: 'total',
      label: total.label,
      requiredHours: total.requiredHours,
      regulation: total.regulation,
    },
    ...ATP_SHARED_EXPERIENCE_REQUIREMENTS,
  ]
}

export const ATP_TRACK_OPTIONS: { id: AtpTrackId; label: string }[] = [
  { id: 'atp', label: 'ATP' },
  { id: 'ratp_1000', label: 'R-ATP 1000' },
  { id: 'ratp_1250', label: 'R-ATP 1250' },
]