# Aircraft Database Scripts

This directory contains scripts to download and update the FAA aircraft registry database.

## Initial Setup

Download the FAA aircraft database for the first time:

```bash
npm run update-aircraft-db
```

## Airport Supplement (US GA fields)

Many US general-aviation airports (e.g. `KBEH` Benton Harbor) are not in `@nwpr/airport-codes`. Regenerate the supplement from OurAirports when needed:

```bash
npm run build-airport-supplement
```

This writes `server/data/us-airport-supplement.json` (~2,500 US airports).

## Navaid index (route token classification)

Classify route tokens as navaid vs airport (e.g. `FWA` VORTAC vs `KFWA` airport):

```bash
npm run build-navaid-index
```

This writes `server/data/navaid-index.json` (~6,000 navaids from OurAirports).

Or run directly:

```bash
node scripts/download-faa-aircraft.js
```

This will:
1. Download the latest FAA aircraft registry (~50MB ZIP file)
2. Extract the data
3. Join MASTER.txt with ACFTREF.txt (make/model) and ENGINE.txt (engine model)
4. Map TYPE ENGINE to a pilot-facing class (Piston, Turbofan, …)
5. Save `server/data/aircraft-database.json` and `server/data/aircraft-database-meta.json`
6. Clean up temporary files

## Monthly Updates

The FAA updates their database monthly. To update your local copy:

```bash
npm run update-aircraft-db
```

Or use the convenience script:

```bash
./scripts/update-aircraft-database.sh
```

After updating, commit the changes:

```bash
git add server/data/aircraft-database.json server/data/aircraft-database-meta.json
git commit -m "Update aircraft database - $(date +%Y-%m)"
git push
```

## How It Works

### Hybrid Approach

The aircraft lookup system uses a hybrid approach:

1. **Local Database (Primary)**: 200,000+ aircraft available instantly, offline. Airframe fields (make, model, year, engine class, engine model, category) come from the monthly FAA dump.
2. **FAA inquiry (Owner overlay)**: When the Aircraft Information modal opens on web, owner/city/state can be refreshed from the live registry.
3. **FAA inquiry (Fallback)**: For brand new registrations not yet in the snapshot.

### Benefits

- ⚡ **Instant lookups** for 99.9% of aircraft
- 🌐 **Offline capable** - perfect for mobile app
- 🔄 **Always current** - falls back to API for new registrations
- 📱 **Mobile friendly** - works without internet
- 🎯 **Simple maintenance** - update once per month

## Data Source

Data comes from the [FAA Releasable Aircraft Database](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download)

Updated monthly by the FAA.

## Troubleshooting

### Download fails

If the FAA website is down or slow:
- Wait a few hours and try again
- The system will fall back to FAA API queries

### File size concerns

The `aircraft-database.json` file is ~50-100MB. This is normal and acceptable because:
- It's only loaded on the server (not sent to browser)
- It's lazy-loaded (only when needed)
- It's gzipped in production (~5-10MB)
- Provides offline capability for 200K+ aircraft

### Missing database

If you get "Aircraft database not found" warnings:
1. Run `npm run update-aircraft-db`
2. Wait for download to complete
3. Restart your dev server

The system will work without the database (using FAA API only), but will be slower and require internet.

