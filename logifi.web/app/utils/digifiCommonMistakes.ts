export interface DigifiCommonMistakeChecklistItem {
  id: string
  title: string
  hint: string
}

export const DIGIFI_COMMON_MISTAKE_CHECKLIST: DigifiCommonMistakeChecklistItem[] = [
  {
    id: 'totals',
    title: 'Totals / footer row',
    hint:
      'The bottom totals or carry-forward row is not a flight line. If it appears in the grid, delete those cells or re-scan with Rows set to flight lines only.',
  },
  {
    id: 'remarks',
    title: 'Remarks boundaries',
    hint:
      'Remarks should stay within one flight line. If text from two rows merged or split across lines, check the ruled lines on the photo and re-scan or fix manually.',
  },
  {
    id: 'same-duration',
    title: 'Same-duration consecutive rows',
    hint:
      'Several flights with the same time (e.g. three 1.3 lines) can collapse into fewer rows with remarks joined by " | ". Confirm each paper line has its own grid row.',
  },
  {
    id: 'route',
    title: 'From / To / Route',
    hint:
      'Verify departure vs destination vs intermediates. XC and pattern work often list multiple airports — AI may put a middle stop in From or To.',
  },
  {
    id: 'landings',
    title: 'Landings',
    hint:
      'Day and night landing counts are tiny digits in small boxes — easy to misread 1 vs 7 or skip a landing.',
  },
  {
    id: 'instrument',
    title: 'Night / Actual / Sim / Approaches',
    hint:
      'Adjacent narrow time/count columns; confirm each value is in the correct column, not shifted left or right.',
  },
  {
    id: 'dual',
    title: 'Dual Given / Dual Received',
    hint:
      'When your paper has both columns, AI often swaps or reads the neighbor cell — check every filled dual hour against the photo.',
  },
]

/** Prompt block appended to Digifi Gemini scans (shared with server). */
export const DIGIFI_COMMON_MISTAKE_PROMPT_RULES = [
  'Common mistakes to avoid:',
  'From/departure = first departure airport only; To/destination = final airport only; Route = intermediate stops only (not departure or destination).',
  'XC and pattern flights may list multiple airports — do not put intermediate stops in From or To.',
  'Landings (day/night) are integer counts, not decimal flight times.',
  'Do not swap adjacent narrow columns: night, actual instrument, simulated (hood), approach count, approach type.',
  'When both Dual Given and Dual Received columns exist, read each value under its printed column header — do not shift into the neighbor cell.',
  'Never transcribe the bottom totals, brought forward, or carried forward summary row as a flight line.',
  'Remarks: one rowIndex per flight line — use horizontal ruled lines as boundaries; never merge remarks from adjacent rows.',
  'Consecutive rows with identical total/PIC times (e.g. three 1.3 lines) are still separate flights — never skip a rowIndex or join their remarks with " | ".',
].join(' ')
