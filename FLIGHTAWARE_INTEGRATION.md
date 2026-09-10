# FlightAware AeroAPI Integration for Logifi-Core

## Overview

This implementation adds FlightAware as a pluggable flight enrichment provider for Autofi (FLICA schedule import). FlightAware provides superior OOOI data compared to AeroDataBox, particularly for gate times (Out/In).

## Key Benefits

1. **Complete OOOI coverage**: FlightAware provides all four timestamps (Out, Off, On, In) vs AeroDataBox which only provides Off/On
2. **Pluggable architecture**: Easy to switch between providers or add new ones
3. **Safe rollforward**: AeroDataBox remains the default; FlightAware requires explicit opt-in
4. **No breaking changes**: Existing AeroDataBox integration continues to work

## Environment Configuration

### Required for FlightAware

```bash
FLIGHTAWARE_API_KEY=your_api_key_here
FLIGHT_ENRICH_PROVIDER=flightaware
```

### Optional Overrides

```bash
# Override API base URL (defaults to https://aeroapi.flightaware.com/aeroapi)
FLIGHTAWARE_API_BASE=https://aeroapi.flightaware.com/aeroapi
```

### Rollback to AeroDataBox

```bash
# Remove or set to aerodatabox
FLIGHT_ENRICH_PROVIDER=aerodatabox
# or simply unset FLIGHT_ENRICH_PROVIDER (defaults to aerodatabox)
```

## Implementation Details

### Architecture

```
fetch-flica.post.ts
  └── flightEnrichProvider.ts (abstraction)
      ├── flightAware.ts (FlightAware client)
      │   └── flightAwareEnv.ts
      └── aeroDataBox.ts (AeroDataBox client)
          └── aeroDataBoxEnv.ts
```

### Provider Interface

All providers implement:

```typescript
interface EnrichmentResult {
  actuals: EnrichmentActuals | null
  authRejected: boolean
  rateLimited: boolean
  detail: string | null
  rateLimitResumeMs?: number
}

interface EnrichmentActuals {
  registration: string | null
  aircraftType: string | null
  actualOutLocal: string | null  // Gate departure
  actualOffLocal: string | null  // Wheels-off (runway)
  actualOnLocal: string | null   // Wheels-on (runway)
  actualInLocal: string | null   // Gate arrival
}
```

### FlightAware API Details

**Endpoint**: `GET /flights/{ident}`

**Parameters**:
- `ident_type=designator` (airline code + flight number)
- `start={date}` and `end={date}` (YYYY-MM-DD)
- `max_pages=1` (limit to first page)

**Authentication**: `x-apikey` header

**Response Shape** (relevant fields):
```json
{
  "flights": [
    {
      "fa_flight_id": "AA5770-1722765600-0-0",
      "ident": "AA5770",
      "registration": "N12345",
      "aircraft_type": "E75L",
      "origin": { "code_iata": "LGA" },
      "destination": { "code_iata": "DCA" },
      "actual_out": "2026-08-04T10:08:00Z",
      "actual_off": "2026-08-04T10:20:00Z",
      "actual_on": "2026-08-04T11:05:00Z",
      "actual_in": "2026-08-04T11:15:00Z"
    }
  ]
}
```

## Testing

### Unit Tests

All tests use fixtures and mocks - no live API calls required:

```bash
# Run FlightAware tests
pnpm test flightAware.test.ts

# Run provider abstraction tests
pnpm test flightEnrichProvider.test.ts

# Run all tests
pnpm test
```

### Test Coverage

- 17 FlightAware-specific tests
- 5 provider abstraction tests
- All 936 existing tests continue to pass

### Manual Testing (with live key)

1. Set `FLIGHTAWARE_API_KEY` and `FLIGHT_ENRICH_PROVIDER=flightaware`
2. Connect FLICA in Logifi
3. Navigate to Autofi → Fetch schedule
4. Verify enriched flights show:
   - Tail number
   - Aircraft type
   - All four OOOI times (Out, Off, On, In)

## Rate Limiting

Both providers implement:
- 1-second minimum interval between requests
- HTTP 429 handling with cooldown
- Respect for `Retry-After` header
- URL caching to avoid duplicate requests

## Error Handling

The provider abstraction handles:
- Missing configuration (silently skips enrichment)
- Auth rejection (401/403)
- Rate limiting (429)
- Network errors
- Airport mismatch
- Empty responses

## Data Flow

1. FLICA provides roster + scheduled times
2. Enrichment provider adds:
   - Tail number (if missing)
   - Aircraft type (if missing)
   - Actual OOOI times (Out, Off, On, In)
3. Result merged into `AirlineLeg` before mapping to `FcvMappedEntry`
4. Saved to log_entries with `import_source: 'flica_aerodatabox'` (naming preserved for compatibility)

## Future Considerations

### Adding New Providers

1. Create `server/utils/newProvider.ts` implementing the same interface
2. Add provider to `FlightEnrichProvider` type union
3. Update `getFlightEnrichProvider()` to recognize new provider
4. Add routing logic in `lookupFlightActuals()`

### Provider-Specific Features

Each provider can expose its own features through the abstraction:
- Different rate limit strategies
- Provider-specific error codes
- Enhanced metadata (when needed)

## References

- FlightAware AeroAPI Docs: https://www.flightaware.com/commercial/aeroapi/
- OpenAPI Spec: https://www.flightaware.com/commercial/aeroapi/resources/aeroapi-openapi.yml
- PR: https://github.com/Logifi-LLC/Logifi-Core/pull/54
