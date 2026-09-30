# FlightAware Quick Start for Derek

## TL;DR

FlightAware is the default. Set the key:

```bash
FLIGHTAWARE_API_KEY=<your-flightaware-api-key>
```

Do not set `FLIGHT_ENRICH_PROVIDER` unless you are rolling back. Confirm Production is not pinned to `aerodatabox`.

To roll back to AeroDataBox:

```bash
FLIGHT_ENRICH_PROVIDER=aerodatabox
AERODATABOX_API_KEY=<existing-rapidapi-key>
```

## What This Gets You

**FlightAware** provides all four OOOI timestamps:
- ✅ **Out** (gate departure) - NEW vs AeroDataBox
- ✅ **Off** (wheels-off)
- ✅ **On** (wheels-on)
- ✅ **In** (gate arrival) - NEW vs AeroDataBox
- ✅ Tail/registration
- ✅ Aircraft type

**AeroDataBox** (rollback) only provides:
- ❌ Out (falls back to FLICA scheduled)
- ✅ Off
- ✅ On
- ❌ In (falls back to FLICA scheduled)
- ✅ Tail/registration
- ✅ Aircraft type

## Testing Without Live Key

Unit tests use fixtures. Do not call AeroAPI from tests.

```bash
cd logifi.web
pnpm test
```

## Testing With Live Key

1. Get FlightAware AeroAPI key from https://www.flightaware.com/commercial/aeroapi/
2. Set environment variables (see above)
3. In Logifi:
   - Connect FLICA
   - Go to Autofi → Fetch schedule
   - Verify flights show all four OOOI times

## What's Safe

- ✅ Existing AeroDataBox integration untouched
- ✅ All 936 existing tests pass
- ✅ FLICA remains roster source + gap fallback
- ✅ No data model changes
- ✅ Can flip back to AeroDataBox anytime

## What Changed

### Backend (Hangar-Direct)
- New `flightAware.ts` - FlightAware client
- New `flightEnrichProvider.ts` - Pluggable abstraction
- Updated `fetch-flica.post.ts` - Use provider abstraction
- Updated `nuxt.config.ts` - Add FlightAware config

### No UI Changes
Backend-only. FLICA fetch flow remains identical.

## Architecture

```
FLICA schedule (roster + scheduled times)
  ↓
Provider abstraction (aerodatabox | flightaware)
  ↓
Enriched legs (+ tail + OOOI)
  ↓
log_entries
```

## Rate Limits

Both providers:
- 1 second minimum between requests
- HTTP 429 handling with cooldown
- URL caching for duplicate lookups
- Skips enrichment for flights already in logbook

## Documentation

- Full integration guide: [`FLIGHTAWARE_INTEGRATION.md`](./FLIGHTAWARE_INTEGRATION.md)
- PR: https://github.com/Logifi-LLC/Logifi-Core/pull/54

## Questions to Consider

1. FlightAware is now the default. AeroDataBox remains an explicit env rollback.
2. Do we want to expose provider selection in UI, or keep it env-only?
3. Should we add provider metrics (hit rate, latency) to dashboard?

None of these block key drop - just future considerations.
