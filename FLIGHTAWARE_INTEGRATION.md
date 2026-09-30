# FlightAware AeroAPI Integration for Logifi-Core

## Overview

FlightAware AeroAPI is the default flight-actuals provider for Autofi (FLICA schedule import). It supplies gate and runway times (Out, Off, On, In). AeroDataBox stays in the tree as an explicit rollback for one release.

## Key Benefits

1. **Complete OOOI coverage**: FlightAware provides all four timestamps (Out, Off, On, In) vs AeroDataBox which only provides Off/On
2. **Month-end imports**: dates older than about 9 days use `GET /history/flights/{ident}` (back to 2011-01-01, 7-day max window). Recent dates stay on `GET /flights/{ident}`
3. **Pluggable architecture**: set `FLIGHT_ENRICH_PROVIDER=aerodatabox` to roll back
4. **No import-source rename**: saved rows still use `import_source: 'flica_aerodatabox'`

## Environment Configuration

### Required for FlightAware

```bash
FLIGHTAWARE_API_KEY=your_api_key_here
```

`FLIGHT_ENRICH_PROVIDER` defaults to `flightaware`. Set it only to override.

### Optional Overrides

```bash
# Override API base URL (defaults to https://aeroapi.flightaware.com/aeroapi)
FLIGHTAWARE_API_BASE=https://aeroapi.flightaware.com/aeroapi
```

### Rollback to AeroDataBox

```bash
FLIGHT_ENRICH_PROVIDER=aerodatabox
```

Unset `FLIGHT_ENRICH_PROVIDER` does not roll back. AeroDataBox also needs `AERODATABOX_API_KEY`.

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

**Endpoints** (same query params, same flight fields):

- `GET /flights/{ident}` when the window starts within 9 days of now. AeroAPI only allows this endpoint's `start`/`end` within 10 days in the past and 2 days in the future. About $0.005 per result set.
- `GET /history/flights/{ident}` when the window starts more than 9 days ago. Data back to 2011-01-01. The span must be at most 7 days. About $0.020 per result set (roughly $0.40 vs $1.60 per pilot-month at recent-vs-history rates).

**Parameters**:
- `ident_type=designator` (ICAO ident preferred: `RPA4752`, not `YX4752` or a bare number)
- `start` inclusive and `end` exclusive, UTC date-time built from the departure airport's local day (widened by 14 hours each side when the timezone is unknown)
- `max_pages=1`

HTTP 400 (date out of range) stops that leg. Registration is the tail only; `aircraft_type` is not copied into the tail field.

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

1. Set `FLIGHTAWARE_API_KEY` (provider already defaults to FlightAware)
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
