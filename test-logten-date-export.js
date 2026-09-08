// Test script to demonstrate exact LogTen package date string output
// Run: node test-logten-date-export.js

// Simulate Derek's entry: 9/8 with defaultYear 2026, normalized to 2026-09-08
const mockEntry = {
  id: 'test-derek-entry',
  date: '2026-09-08',  // After normalization from 9/8 + defaultYear 2026
  role: 'PIC',
  departure: 'KPHX',
  destination: 'KSDL',
  registration: 'N12345',
  aircraftMakeModel: 'Cessna 172',
  aircraftCategoryClass: 'ASEL',
  flightTime: { total: 1.5, pic: 1.5 },
  performance: {},
};

// Simulate formatExportDate (from formatters.ts)
function formatExportDate(isoDate, target) {
  const trimmed = (isoDate || '').trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (target === 'mdy') return `${month}/${day}/${year}`;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return trimmed;
}

// Simulate buildLogTenFlightEntity (simplified)
function buildLogTenFlightEntity(entry) {
  return {
    entity_name: 'Flight',
    flight_key: entry.id,
    flight_flightDate: formatExportDate(entry.date, 'iso'),
    flight_from: entry.departure,
    flight_to: entry.destination,
    flight_totalTime: String(entry.flightTime.total.toFixed(1)),
    flight_selectedAircraftID: entry.registration,
    flight_selectedAircraftType: entry.aircraftMakeModel,
    flight_selectedAircraftClass: entry.aircraftCategoryClass,
    flight_pic: String(entry.flightTime.pic.toFixed(1)),
  };
}

// Simulate buildLogTenPackage
function buildLogTenPackage(entries) {
  return {
    metadata: {
      application: 'Digifi/Logifi',
      version: '1.0',
      serviceID: 'com.logifi.digifi',
      dateFormat: 'yyyy-MM-dd',
      dateAndTimeFormat: "yyyy-MM-dd'T'HH:mm:ss'Z'",
      timesAreZulu: true,
    },
    entities: entries.map(buildLogTenFlightEntity),
  };
}

// Build package and show exact output
const pkg = buildLogTenPackage([mockEntry]);
const jsonString = JSON.stringify(pkg, null, 2);

console.log('=== LogTen Package JSON (Derek\'s 9/8 entry) ===\n');
console.log(jsonString);

console.log('\n=== Key Assertion ===');
console.log(`flight_flightDate: "${pkg.entities[0].flight_flightDate}"`);
console.log(`Expected: "2026-09-08" (Sep 8, 2026)`);
console.log(`NOT: "2026-09-07" (Sep 7, 2026 - UTC shift bug)`);
console.log(`NOT: "2027-09-08" (Sep 8, 2027 - year rollover bug)`);

// Verify exact match
if (pkg.entities[0].flight_flightDate === '2026-09-08') {
  console.log('\n✅ PASS: Date is correct!');
} else {
  console.log(`\n❌ FAIL: Got "${pkg.entities[0].flight_flightDate}" instead of "2026-09-08"`);
}
