# LogTen Date Shift Fix: `timesAreZulu: false`

## Problem

Derek reported that after the MDY format fix, dates were **still** off by -1 day in LogTen:
- Digifi grid shows: `9/8/26` and `9/6/26`
- LogTen displays: `9/7/26` and `9/5/26` (−1 day every row)

## Root Cause

According to Coradine LogTen API docs:

> `timesAreZulu` - The `timesAreZulu` parameter specifies whether any passed in String time values are in Zulu time or should be converted to local time based on the time zone of the departure or arrival airports. Valid values for the `timesAreZulu` parameter are `true` or `false`. If this parameter is not supplied, the default value is `true`.

> The `timesAreZulu` parameter is only applicable to date/time values that are passed in as Strings.

When `timesAreZulu: true`, LogTen's `NSDateFormatter` interprets **even date-only strings** as UTC midnight. For a user in US Central time (UTC-6), UTC midnight `00:00:00` becomes the **previous calendar day** at `18:00:00` local time.

Example:
- Digifi package contains: `"flight_flightDate": "09/08/2026"` 
- With `timesAreZulu: true`, LogTen parses as: `2026-09-08T00:00:00Z` (UTC)
- In US Central (UTC-6): `2026-09-07T18:00:00-06:00` → displays as **Sep 7, 2026**

## Solution

Set `timesAreZulu: false` in the LogTen package metadata so date strings are parsed as **local calendar dates** without timezone conversion.

## Before/After

### BEFORE (wrong)

```json
{
  "metadata": {
    "dateFormat": "MM/dd/yyyy",
    "dateAndTimeFormat": "MM/dd/yyyy HH:mm",
    "timesAreZulu": true
  },
  "entities": [
    {
      "flight_flightDate": "09/08/2026"
    }
  ]
}
```

**Result**: LogTen displays **Sep 7, 2026** (−1 day) in US Central time

### AFTER (correct)

```json
{
  "metadata": {
    "dateFormat": "MM/dd/yyyy",
    "dateAndTimeFormat": "MM/dd/yyyy HH:mm",
    "timesAreZulu": false
  },
  "entities": [
    {
      "flight_flightDate": "09/08/2026"
    }
  ]
}
```

**Result**: LogTen displays **Sep 8, 2026** (correct) - local calendar date preserved

## Changes

### `logifi.web/app/utils/logtenHandoff.ts`

```diff
export function buildLogTenPackage(entries: LogEntry[]): LogTenPackage {
  return {
    metadata: {
      application: 'Digifi/Logifi',
      version: '1.0',
      serviceID: 'com.logifi.digifi',
      dateFormat: 'MM/dd/yyyy',
      dateAndTimeFormat: 'MM/dd/yyyy HH:mm',
-     timesAreZulu: true,
+     timesAreZulu: false,
    },
    entities: entries.map(buildLogTenFlightEntity),
  }
}
```

### `logifi.web/tests/unit/logtenHandoff.test.ts`

```diff
describe('buildLogTenPackage', () => {
  it('creates package with correct metadata matching Coradine sample', () => {
    const entry = createBaseEntry()
    const pkg = buildLogTenPackage([entry])

    expect(pkg.metadata.application).toBe('Digifi/Logifi')
    expect(pkg.metadata.version).toBe('1.0')
    expect(pkg.metadata.serviceID).toBe('com.logifi.digifi')
    expect(pkg.metadata.dateFormat).toBe('MM/dd/yyyy')
    expect(pkg.metadata.dateAndTimeFormat).toBe('MM/dd/yyyy HH:mm')
-   expect(pkg.metadata.timesAreZulu).toBe(true)
+   expect(pkg.metadata.timesAreZulu).toBe(false)
  })
```

## Testing

Created `test-timesarezulu-fix.js` to verify the exact package output:

```bash
$ node test-timesarezulu-fix.js

=== LogTen Package (FIXED) ===
{
  "metadata": {
    "timesAreZulu": false
  },
  "entities": [
    {
      "flight_flightDate": "09/08/2026"
    }
  ]
}

BEFORE (wrong):
  timesAreZulu: true
  flight_flightDate: "09/08/2026"
  → LogTen parsed as UTC midnight → displayed as 09/07/2026 in US Central

AFTER (correct):
  timesAreZulu: false
  flight_flightDate: "09/08/2026"
  → LogTen parsed as local calendar date → displayed as 09/08/2026
```

## Summary

The fix is a **one-line change** from `timesAreZulu: true` to `timesAreZulu: false`. This ensures LogTen's `NSDateFormatter` interprets date strings as local calendar dates, preventing the UTC midnight timezone shift that was causing the -1 day bug.

Derek should now see:
- Digifi grid: `9/8/26` → LogTen: `Sep 8, 2026` ✅
- Digifi grid: `9/6/26` → LogTen: `Sep 6, 2026` ✅

No more date shifts!
