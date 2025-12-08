declare module 'airport-codes' {
  interface AirportData {
    icao?: string
    iata?: string
    name?: string
    city?: string
    state?: string
    country?: string
    elevation?: number
    latitude?: number
    longitude?: number
    timezone?: string
  }

  interface Airport {
    toJSON(): AirportData
  }

  interface AirportCodes {
    findWhere(query: { icao?: string; iata?: string }): Airport | null
  }

  const AirportCodes: AirportCodes
  export default AirportCodes
}

