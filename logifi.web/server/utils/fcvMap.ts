/**
 * Placeholder FC View API flight shape. Align with real GET /flights/ response once docs are available.
 */
export interface FcvFlight {
  id: string | number
  date?: string
  departure?: string
  destination?: string
  route?: string
  aircraft_make_model?: string
  registration?: string
  flight_number?: string
  role?: string
  block_time?: number
  [key: string]: unknown
}

/**
 * Preview/import payload: log_entries-compatible object with fcv_flight_id set.
 */
export interface FcvMappedEntry {
  fcv_flight_id: string
  date: string
  role: string
  aircraft_category_class: string
  category_class_time: number | null
  aircraft_make_model: string
  registration: string
  flight_number: string | null
  departure: string
  destination: string
  route: string | null
  flight_time: Record<string, unknown>
  performance: Record<string, unknown>
  oooi: Record<string, unknown> | null
  is_imported: boolean
  import_source: string
  original_entry_date: string | null
  import_metadata: Record<string, unknown> | null
}

function toDateStr(v: string | undefined): string {
  if (!v) return new Date().toISOString().slice(0, 10)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

/**
 * Map one FC View flight to our log_entries preview/insert shape.
 */
export function mapFcvFlightToEntry(flight: FcvFlight): FcvMappedEntry {
  const fcvId = String(flight.id ?? '')
  const date = toDateStr(flight.date as string)
  return {
    fcv_flight_id: fcvId,
    date,
    role: (flight.role as string) || 'PIC',
    aircraft_category_class: 'Airplane',
    category_class_time: typeof flight.block_time === 'number' ? flight.block_time : null,
    aircraft_make_model: (flight.aircraft_make_model as string) || 'Unknown',
    registration: (flight.registration as string) || '',
    flight_number: (flight.flight_number as string) || null,
    departure: (flight.departure as string) || '',
    destination: (flight.destination as string) || '',
    route: (flight.route as string) || null,
    flight_time: typeof flight.block_time === 'number' ? { total: flight.block_time } : {},
    performance: {},
    oooi: null,
    is_imported: true,
    import_source: 'fc_view',
    original_entry_date: flight.date ? new Date(flight.date as string).toISOString() : null,
    import_metadata: { source: 'fc_view', fcv_id: fcvId },
  }
}
