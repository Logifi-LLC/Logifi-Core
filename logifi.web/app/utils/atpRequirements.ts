/**
 * Airline transport pilot aeronautical experience (airplane category).
 * Display-only constants; log totals are compared elsewhere.
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

/** 14 CFR 61.159 airplane category (standard ATP). */
export const ATP_AIRPLANE_REQUIREMENTS: AtpRequirementRow[] = [
  { key: 'total', label: 'Total time', requiredHours: 1500, regulation: '14 CFR 61.159(a)(1)' },
  { key: 'pic', label: 'PIC', requiredHours: 250, regulation: '14 CFR 61.159(a)(2)' },
  {
    key: 'crossCountry',
    label: 'PIC cross-country',
    requiredHours: 500,
    regulation: '14 CFR 61.159(a)(4)',
  },
  { key: 'night', label: 'Night', requiredHours: 100, regulation: '14 CFR 61.159(a)(5)' },
  {
    key: 'instrument',
    label: 'Instrument',
    requiredHours: 75,
    regulation: '14 CFR 61.159(a)(6)',
  },
  {
    key: 'multiEngine',
    label: 'Multi-engine',
    requiredHours: 50,
    regulation: '14 CFR 61.159(a)(7)',
  },
]

/**
 * 14 CFR 61.160 reduced ATP (airplane). Totals differ by pathway; other rows follow
 * the simplified 1000/1250 progress style used in Logifi analytics (not every
 * 61.160 paragraph is modeled here).
 */
export const RATP_1000_AIRPLANE_REQUIREMENTS: AtpRequirementRow[] = [
  { key: 'total', label: 'Total time', requiredHours: 1000, regulation: '14 CFR 61.160(a)(1)' },
  { key: 'pic', label: 'PIC', requiredHours: 250, regulation: '14 CFR 61.159(a)(2)' },
  { key: 'crossCountry', label: 'Cross-country', requiredHours: 200, regulation: '14 CFR 61.160(a)(2)' },
  { key: 'night', label: 'Night', requiredHours: 100, regulation: '14 CFR 61.159(a)(5)' },
  {
    key: 'instrument',
    label: 'Instrument',
    requiredHours: 75,
    regulation: '14 CFR 61.159(a)(6)',
  },
  {
    key: 'multiEngine',
    label: 'Multi-engine',
    requiredHours: 50,
    regulation: '14 CFR 61.159(a)(7)',
  },
]

export const RATP_1250_AIRPLANE_REQUIREMENTS: AtpRequirementRow[] = [
  { key: 'total', label: 'Total time', requiredHours: 1250, regulation: '14 CFR 61.160(b)(1)' },
  { key: 'pic', label: 'PIC', requiredHours: 250, regulation: '14 CFR 61.159(a)(2)' },
  { key: 'crossCountry', label: 'Cross-country', requiredHours: 200, regulation: '14 CFR 61.160(b)(2)' },
  { key: 'night', label: 'Night', requiredHours: 100, regulation: '14 CFR 61.159(a)(5)' },
  {
    key: 'instrument',
    label: 'Instrument',
    requiredHours: 75,
    regulation: '14 CFR 61.159(a)(6)',
  },
  {
    key: 'multiEngine',
    label: 'Multi-engine',
    requiredHours: 50,
    regulation: '14 CFR 61.159(a)(7)',
  },
]

export function requirementsForAtpTrack(track: AtpTrackId): AtpRequirementRow[] {
  switch (track) {
    case 'ratp_1000':
      return RATP_1000_AIRPLANE_REQUIREMENTS
    case 'ratp_1250':
      return RATP_1250_AIRPLANE_REQUIREMENTS
    default:
      return ATP_AIRPLANE_REQUIREMENTS
  }
}

export const ATP_TRACK_OPTIONS: { id: AtpTrackId; label: string }[] = [
  { id: 'atp', label: 'ATP' },
  { id: 'ratp_1000', label: 'R-ATP 1000' },
  { id: 'ratp_1250', label: 'R-ATP 1250' },
]