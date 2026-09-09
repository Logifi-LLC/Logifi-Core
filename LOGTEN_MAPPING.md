# LogTen Pro Field Mapping

This document describes how Logifi LogEntry fields map to LogTen Pro API attributes via the `logten://v2/addEntities` handoff.

## ✅ Mapped Fields

The following fields from LogEntry / Digifi capture are mapped to LogTen Pro:

### Core Flight Information
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `id` | `flight_key` | String | Unique identifier for the flight |
| `date` | `flight_flightDate` | Date (ISO) | Flight date |
| `departure` | `flight_from` | String | Departure airport code |
| `destination` | `flight_to` | String | Destination airport code |
| `route` | `flight_route` | String | Route of flight |
| `remarks` | `flight_remarks` | String | Flight remarks/comments |

### Aircraft Information
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `registration` | `flight_selectedAircraftID` | String | Aircraft tail number/registration |
| `aircraftMakeModel` | `flight_selectedAircraftType` | String | Aircraft type (ICAO code preferred) |
| `aircraftCategoryClass` | `flight_selectedAircraftClass` | String | Category/Class (ASEL, AMEL, etc.) |
| `flightNumber` | `flight_flightNumber` | String | Flight number |

### Flight Times
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `flightTime.total` | `flight_totalTime` | Decimal Hours | Total flight time |
| `flightTime.pic` | `flight_pic` | Decimal Hours | Pilot in Command time |
| `flightTime.sic` | `flight_sic` | Decimal Hours | Second in Command time |
| `flightTime.night` | `flight_night` | Decimal Hours | Night flight time |
| `flightTime.crossCountry` | `flight_crossCountry` | Decimal Hours | Cross country time |
| `flightTime.dual` | `flight_dualReceived` | Decimal Hours | Dual received time |
| `flightTime.solo` | `flight_solo` | Decimal Hours | Solo time |
| `flightTime.actualInstrument` | `flight_actualInstrument` | Decimal Hours | Actual instrument time |
| `flightTime.simulatedInstrument` | `flight_simulatedInstrument` | Decimal Hours | Simulated instrument (hood) time |
| `flightTime.dualGiven` | `flight_dualGiven` | Decimal Hours | Dual given (CFI) time |
| `flightTime.nvg` | `flight_nightVisionGoggle` | Decimal Hours | Night vision goggle time |
| `flightTime.ffs + ftd + atd` | `flight_ground` | Decimal Hours | Combined simulator time (FFS + FTD + ATD) |

### Performance Metrics
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `performance.dayLandings` | `flight_dayLandings` | Integer | Day landings count |
| `performance.nightLandings` | `flight_nightLandings` | Integer | Night landings count |
| `performance.dayTakeoffs` | `flight_dayTakeoffs` | Integer | Day takeoffs count |
| `performance.nightTakeoffs` | `flight_nightTakeoffs` | Integer | Night takeoffs count |
| `performance.holdingProcedures` | `flight_holds` | Integer | Holding procedures count |

### Approaches
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `performance.approaches[]` | `flight_selectedApproach1` through `flight_selectedApproach10` | String | Up to 10 approaches. Format: "TYPE" for single, "TYPE (COUNT)" for multiple |

**Approach Mapping Logic:**
- Modern: Uses `performance.approaches[]` array (preferred)
- Legacy: Falls back to `performance.approachCount` + `performance.approachType` if approaches array is empty
- Each approach can have a type (ILS, RNAV, VOR, GPS, etc.) and count
- Single approach with count=1 sends just the type: `"ILS"`
- Multiple approaches send type with count: `"ILS (2)"`
- LogTen supports up to 10 approach slots; extras are truncated

### Crew Members
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `picName` | `flight_selectedCrewPIC` | String | PIC name |
| `sicName` | `flight_selectedCrewSIC` | String | SIC/Co-pilot name |
| `trainingElements` + `trainingInstructor="Instructor"` | `flight_selectedCrewInstructor` | String | Instructor name |
| `trainingElements` + `trainingInstructor="Student"` | `flight_selectedCrewStudent` | String | Student name |

### OOOI Times (Out-Off-On-In)
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `oooi.out` | `flight_taxiOutTime` | ISO Timestamp | Out time (gate departure) |
| `oooi.off` | `flight_takeoffTime_zulu` | ISO Timestamp | Off time (wheels up) |
| `oooi.on` | `flight_landingTime_zulu` | ISO Timestamp | On time (wheels down) |
| `oooi.in` | `flight_taxiInTime` | ISO Timestamp | In time (gate arrival) |

### Flight Conditions & Type
| Logifi Field | LogTen API Attribute | Data Type | Notes |
|-------------|---------------------|-----------|-------|
| `flightConditions` includes "IFR" | `flight_ifrCapacity` | Boolean | IFR flight indicator |
| `logbookType="simulator"` | `flight_simulator` | Decimal Hours | Simulator time (same as total) |
| `logbookType="simulator"` | `flight_type` | Integer | 3 = Simulator per LogTen API |

## ⚠️ Fields With No LogTen Equivalent

The following Logifi fields have no direct mapping in the LogTen Pro API and are **not sent**:

| Logifi Field | Reason |
|-------------|--------|
| `role` | User's role in flight. PIC/SIC time is sent via time fields instead |
| `categoryClassTime` | Derived from total time + category/class |
| `instructorCertificate` | No LogTen field for instructor certificate number |
| `tags[]` | Custom tags (Checkride, IPC, etc.) - no LogTen equivalent |
| `flagged` | Logifi-specific UI flag. LogTen has its own `flight_flagged` but not mapped |
| `signaturePending`, `pendingInstructorId`, `amendsEntryId`, `isVoid` | Logifi signature workflow fields |
| `isImported`, `importSource`, `importBatchId`, `importMetadata` | Import tracking metadata |
| `version`, `dataHash`, `createdAt`, `updatedAt` | Integrity & audit fields |
| `originalEntryDate` | Import provenance |

## 📋 Complete LogTen Flight Attributes Reference

LogTen Pro supports many additional attributes beyond what Logifi captures. For the complete list, see:
- [Coradine LogTen API Documentation](https://github.com/Coradine/logten-api)
- Flight Attributes Appendix in the API README

Notable LogTen fields **not currently used** by Logifi (but available if needed):
- `flight_distance`, `flight_duration` (auto-calculated by LogTen)
- `flight_hobbsStart`, `flight_hobbsStop`, `flight_tachStart`, `flight_tachStop`
- Various fuel fields (`flight_fuelBurned`, `flight_fuelRemaining`, etc.)
- Advanced operations: `flight_catII`, `flight_catIII`, `flight_autolands`, `flight_arrests`, `flight_catapults`, `flight_bolters`, `flight_fcls`
- Duty time tracking fields
- Custom fields (`flight_customTime1`-`20`, `flight_customNote1`-`10`, etc.)
- Weather fields (`flight_weather`, `flight_sky`, `flight_visibility`, `flight_windDirection`, `flight_windVelocity`)

## 🧪 Testing

The mapping is tested in `tests/unit/logtenHandoff.test.ts` with comprehensive coverage including:
- Individual field mappings
- Approach handling (single, multiple, legacy format)
- OOOI time conversion
- Crew member role mapping
- Simulator type detection
- Complete flight entity with all fields

## 📝 Metadata

The LogTen package includes metadata identifying the source:
- `application`: "Digifi/Logifi"
- `version`: "1.0"
- `serviceID`: "com.logifi.digifi"
- `dateFormat`: "yyyy-MM-dd"
- `dateAndTimeFormat`: "yyyy-MM-dd'T'HH:mm:ss'Z'"
- `timesAreZulu`: true

---

**Last Updated:** 2024-09-08  
**LogTen API Version:** 2.0.2 (2021-04-06)
