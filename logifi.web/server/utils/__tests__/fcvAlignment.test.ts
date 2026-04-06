import { describe, expect, it } from 'vitest'
import {
  alignMappedFcvEntry,
  buildAlignmentIndex,
  normalizeRegistrationKey,
  resolveCrewName,
} from '../fcvAlignment'
import type { FcvMappedEntry } from '../fcvMap'

function baseMappedEntry(): FcvMappedEntry {
  return {
    fcv_flight_id: 'fcv-1',
    date: '2026-04-01',
    role: 'PIC',
    aircraft_category_class: 'AIRPLANE',
    category_class_time: 1.2,
    aircraft_make_model: 'E75S',
    registration: 'N133HQ',
    flight_number: 'AA123',
    departure: 'KORD',
    destination: 'KBOS',
    route: 'KORD-KBOS',
    training_elements: 'KLIEN, NICKLOUS',
    training_instructor: 'First Officer',
    flight_time: { total: 1.2, pic: 1.2 },
    performance: {},
    oooi: null,
    remarks: null,
    tags: [],
    flight_conditions: ['ifr'],
    is_imported: true,
    import_source: 'fc_view',
    original_entry_date: null,
    import_metadata: { source: 'fc_view' },
  }
}

describe('fcvAlignment', () => {
  it('normalizes tail keys consistently', () => {
    expect(normalizeRegistrationKey('N-133 hq')).toBe('N133HQ')
    expect(normalizeRegistrationKey(' n133hq ')).toBe('N133HQ')
  })

  it('aligns aircraft by existing registration identity (N133HQ)', () => {
    const idx = buildAlignmentIndex([
      {
        registration: 'N133HQ',
        aircraft_make_model: 'ERJ-170',
        aircraft_category_class: 'AMEL',
        training_elements: null,
      },
    ])
    const aligned = alignMappedFcvEntry(baseMappedEntry(), idx)
    expect(aligned.aircraft_make_model).toBe('ERJ-170')
    expect(aligned.aircraft_category_class).toBe('AMEL')
    expect(aligned.registration).toBe('N133HQ')
    expect((aligned.import_metadata as Record<string, unknown>).alignment).toMatchObject({
      aircraft_strategy: 'tail_match',
      tail_key: 'N133HQ',
    })
  })

  it('maps crew typo to canonical existing name when high confidence', () => {
    const idx = buildAlignmentIndex([
      {
        registration: null,
        aircraft_make_model: null,
        aircraft_category_class: null,
        training_elements: 'Nicklaus Klein',
      },
    ])
    const resolved = resolveCrewName('KLIEN, NICKLOUS', idx)
    expect(resolved.resolvedName).toBe('Nicklaus Klein')
    expect(resolved.strategy).toBe('fuzzy')
    expect((resolved.score ?? 0) > 0.82).toBe(true)
  })

  it('keeps imported crew name when fuzzy result is ambiguous', () => {
    const idx = buildAlignmentIndex([
      {
        registration: null,
        aircraft_make_model: null,
        aircraft_category_class: null,
        training_elements: 'Nicklaus Klein',
      },
      {
        registration: null,
        aircraft_make_model: null,
        aircraft_category_class: null,
        training_elements: 'Nickolas Klien',
      },
    ])
    const aligned = alignMappedFcvEntry(baseMappedEntry(), idx)
    expect(aligned.training_elements).toBe('KLIEN, NICKLOUS')
    expect((aligned.import_metadata as Record<string, any>).alignment.crew.strategy).toBe(
      'ambiguous'
    )
  })
})
