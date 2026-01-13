# API Reference

This document provides API reference for Logifi composables and utility functions.

## Composables

### useAuth

Authentication composable for managing user authentication state.

**Location**: `app/composables/useAuth.ts`

**Returns**:
- `user` (Ref<User | null>): Current user object
- `session` (Ref<Session | null>): Current session
- `isAuthenticated` (Computed<boolean>): Whether user is authenticated
- `isLoading` (Ref<boolean>): Loading state
- `error` (Ref<string | null>): Error message
- `initAuth()`: Initialize authentication state
- `signUp(email, password)`: Sign up a new user
- `signIn(email, password)`: Sign in a user
- `signOut()`: Sign out current user

**Example**:
```typescript
const { user, isAuthenticated, signIn, signOut } = useAuth()
await signIn('user@example.com', 'password')
```

### useCurrency

Currency tracking composable for Part 61.57 requirements.

**Location**: `app/composables/useCurrency.ts`

**Returns**:
- `passengerCurrency` (Ref<CurrencyStatus | null>): 90-day passenger currency
- `nightCurrency` (Ref<CurrencyStatus | null>): 90-day night currency
- `instrumentCurrency` (Ref<CurrencyStatus | null>): 6-month instrument currency
- `annualRequirements` (Ref<AnnualCurrencyStatus | null>): Annual requirements
- `isLoading` (Ref<boolean>): Loading state
- `error` (Ref<string | null>): Error message
- `calculateAllCurrency(entries, referenceDate?)`: Calculate all currency types
- `clearCurrency()`: Clear all currency calculations
- `currentCurrencyCount` (Computed<number>): Number of current currency types
- `totalCurrencyTypes` (Computed<number>): Total currency types (4)
- `hasAnyCurrency` (Computed<boolean>): Whether any currency data exists

**Example**:
```typescript
const { calculateAllCurrency, passengerCurrency } = useCurrency()
await calculateAllCurrency(logEntries)
console.log(passengerCurrency.value?.isCurrent)
```

### useValidation

Validation composable for log entry validation.

**Location**: `app/composables/useValidation.ts`

**Returns**:
- `validationResults` (Ref<ValidationResult[]>): All validation results
- `validationErrors` (Computed<ValidationResult[]>): Error results only
- `validationWarnings` (Computed<ValidationResult[]>): Warning results only
- `hasErrors` (Computed<boolean>): Whether there are errors
- `hasWarnings` (Computed<boolean>): Whether there are warnings
- `hasIssues` (Computed<boolean>): Whether there are errors or warnings
- `isLoading` (Ref<boolean>): Loading state
- `error` (Ref<string | null>): Error message
- `validateEntry(entry, allEntries?)`: Validate a log entry
- `clearValidation()`: Clear validation results

**Example**:
```typescript
const { validateEntry, hasErrors, validationErrors } = useValidation()
await validateEntry(entry, allEntries)
if (hasErrors.value) {
  console.log(validationErrors.value)
}
```

### useExport

Export composable for preparing entries for export with audit trail.

**Location**: `app/composables/useExport.ts`

**Returns**:
- `fetchAuditTrailForEntries(entryIds)`: Fetch audit trail for multiple entries
- `prepareEntryForExport(entry, auditLogs?)`: Prepare a single entry for export
- `batchPrepareEntriesForExport(entries, includeAuditTrail)`: Batch prepare entries

**Example**:
```typescript
const { batchPrepareEntriesForExport } = useExport()
const exportData = await batchPrepareEntriesForExport(entries, true)
```

### useOffline

Offline detection and sync status composable.

**Location**: `app/composables/useOffline.ts`

**Returns**:
- `isOnline` (Ref<boolean>): Online status
- `isSyncing` (Ref<boolean>): Whether sync is in progress
- `syncProgress` (Ref<SyncProgress>): Sync progress information
- `startMonitoring()`: Start connectivity monitoring
- `stopMonitoring()`: Stop connectivity monitoring
- `updateOnlineStatus()`: Manually update online status

**Example**:
```typescript
const { isOnline, startMonitoring } = useOffline()
startMonitoring()
if (!isOnline.value) {
  console.log('Offline mode')
}
```

### useSyncQueue

Sync queue management for offline operations.

**Location**: `app/composables/useSyncQueue.ts`

**Returns**:
- `queue` (Ref<SyncOperation[]>): Sync queue
- `isProcessing` (Ref<boolean>): Whether queue is being processed
- `addOperation(operation)`: Add operation to queue
- `processQueue()`: Process queued operations
- `clearQueue()`: Clear the queue

### useDataIntegrity

Data integrity validation composable.

**Location**: `app/composables/useDataIntegrity.ts`

**Returns**:
- `validateEntry(entry)`: Validate entry integrity
- Other integrity-related functions

### useAuditTrail

Audit trail composable for viewing entry history.

**Location**: `app/composables/useAuditTrail.ts`

**Returns**:
- Functions for fetching and displaying audit trail

### useAircraftLookup

Aircraft lookup composable for FAA aircraft database.

**Location**: `app/composables/useAircraftLookup.ts`

**Returns**:
- `lookupAircraft(registration)`: Lookup aircraft information

### useAirportLookup

Airport lookup composable for airport information.

**Location**: `app/composables/useAirportLookup.ts`

**Returns**:
- `lookupAirport(code)`: Lookup airport information

## Utility Functions

### Currency Calculator

**Location**: `app/utils/currencyCalculator.ts`

**Functions**:
- `calculatePassengerCurrency(entries, referenceDate?)`: Calculate 90-day passenger currency
- `calculateNightCurrency(entries, referenceDate?)`: Calculate 90-day night currency
- `calculateInstrumentCurrency(entries, referenceDate?)`: Calculate 6-month instrument currency
- `calculateAnnualRequirements(entries, referenceDate?)`: Calculate annual requirements

**Example**:
```typescript
import { calculatePassengerCurrency } from '~/utils/currencyCalculator'
const currency = calculatePassengerCurrency(entries, new Date())
console.log(currency.isCurrent, currency.daysRemaining)
```

### Validation

**Location**: `app/utils/validation.ts`

**Functions**:
- `validateDate(entry, allEntries?)`: Validate entry date
- `validateFlightTime(entry)`: Validate flight time breakdown
- `validateCrossCountry(entry, airportCoords?)`: Validate cross-country flight
- `validatePart61RequiredFields(entry)`: Validate Part 61 required fields
- `validateDateFormat(date)`: Validate date format
- `validateAirportCode(code)`: Validate airport code format
- `validateAircraftRegistration(registration)`: Validate aircraft registration
- `validateNumericPrecision(value, precision)`: Validate numeric precision

**Example**:
```typescript
import { validateFlightTime } from '~/utils/validation'
const results = validateFlightTime(entry)
results.forEach(result => {
  if (result.type === 'error') {
    console.error(result.message)
  }
})
```

### Night Time Calculator

**Location**: `app/utils/nightTimeCalculator.ts`

**Functions**:
- `calculateNightTime(params)`: Calculate night time for a flight

**Example**:
```typescript
import { calculateNightTime } from '~/utils/nightTimeCalculator'
const result = calculateNightTime({
  date: '2024-06-15',
  depLatitude: 40.6398,
  depLongitude: -73.7789,
  outTime: '20:00',
  inTime: '22:00',
  isZulu: true
})
console.log(result.nightHours, result.totalHours)
```

### Form 8710 Calculator

**Location**: `app/utils/form8710Calculator.ts`

**Functions**:
- `calculateSectionII(entries)`: Calculate Section II (Recent Experience)
- `calculateSectionIII(entries)`: Calculate Section III (Record of Pilot Time)

**Example**:
```typescript
import { calculateSectionIII } from '~/utils/form8710Calculator'
const sectionIII = calculateSectionIII(entries)
console.log(sectionIII.categories)
```

### IndexedDB Utilities

**Location**: `app/utils/indexedDB.ts`

**Functions**:
- `initIndexedDB()`: Initialize IndexedDB database
- `saveEntryToIndexedDB(entry)`: Save entry to IndexedDB
- `updateEntryInIndexedDB(entry)`: Update entry in IndexedDB
- `deleteEntryFromIndexedDB(entryId)`: Delete entry from IndexedDB
- `getAllEntriesFromIndexedDB()`: Get all entries from IndexedDB

### Migration Utilities

**Location**: `app/utils/migrateLocalStorage.ts`

**Functions**:
- `migrateLocalStorageToSupabase(userId, progressCallback?)`: Migrate localStorage data to Supabase
- `hasMigrationCompleted()`: Check if migration has completed

### Duplicate Detection

**Location**: `app/utils/duplicateDetection.ts`

**Functions**:
- `findDuplicateEntries(entries)`: Find duplicate entries in an array
- `checkDuplicatesInDatabase(entries)`: Check for duplicates in database

## Types

### LogEntry

**Location**: `app/utils/logbookTypes.ts`

Main log entry type containing all flight log data.

### CurrencyStatus

**Location**: `app/utils/logbookTypes.ts`

Currency status type with `isCurrent`, `daysRemaining`, `expirationDate`, `status`, etc.

### ValidationResult

**Location**: `app/utils/validation.ts`

Validation result type with `type`, `field`, `message`, `suggestion`, etc.

## Supabase Client

**Location**: `app/lib/supabase.ts`

The Supabase client is exported as `supabase` and can be used directly:

```typescript
import { supabase } from '~/lib/supabase'

// Query entries
const { data, error } = await supabase
  .from('log_entries')
  .select('*')
  .eq('user_id', userId)

// Insert entry
const { data, error } = await supabase
  .from('log_entries')
  .insert(entryData)

// Update entry
const { data, error } = await supabase
  .from('log_entries')
  .update(updateData)
  .eq('id', entryId)
```

## Server API Endpoints

**Location**: `app/server/api/`

### GET /api/lookup-aircraft

Lookup aircraft information by registration.

**Query Parameters**:
- `registration` (string, required): Aircraft registration (N-number)

**Returns**: Aircraft information object

### GET /api/lookup-airport

Lookup airport information by code.

**Query Parameters**:
- `code` (string, required): Airport code (ICAO or IATA)

**Returns**: Airport information object

## Configuration

### Supabase Configuration

**Location**: `app/config/supabase.ts`

Supabase configuration is loaded from environment variables:
- `NUXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Runtime Configuration

**Location**: `nuxt.config.ts`

Runtime configuration is set up in Nuxt config for client-side access.
