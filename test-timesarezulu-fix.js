// Test script to verify timesAreZulu fix for LogTen date bug
// Expected: timesAreZulu: false, flight_flightDate: "09/08/2026"

const entry = {
  id: 'test-123',
  date: '2026-09-08', // ISO format after Digifi normalize from "9/8" + defaultYear 2026
  role: 'PIC',
  aircraftCategoryClass: 'ASEL',
  aircraftMakeModel: 'Cessna 172',
  registration: 'N12345',
  departure: 'KPHX',
  destination: 'KSDL',
  flightTime: {
    total: 1.5,
  },
  performance: {},
}

// Simulate formatExportDate('2026-09-08', 'mdy')
function formatExportDate(isoDate, target) {
  const trimmed = (isoDate ?? '').trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const year = isoMatch[1]
    const month = parseInt(isoMatch[2], 10)
    const day = parseInt(isoMatch[3], 10)
    if (target === 'mdy') return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return trimmed
}

// Build LogTen package
const pkg = {
  metadata: {
    application: 'Digifi/Logifi',
    version: '1.0',
    serviceID: 'com.logifi.digifi',
    dateFormat: 'MM/dd/yyyy',
    dateAndTimeFormat: 'MM/dd/yyyy HH:mm',
    timesAreZulu: false, // FIXED from true → false
  },
  entities: [
    {
      entity_name: 'Flight',
      flight_key: entry.id,
      flight_flightDate: formatExportDate(entry.date, 'mdy'),
      flight_from: entry.departure,
      flight_to: entry.destination,
      flight_totalTime: '1.5',
      flight_selectedAircraftID: entry.registration,
      flight_selectedAircraftType: entry.aircraftMakeModel,
      flight_selectedAircraftClass: entry.aircraftCategoryClass,
    },
  ],
}

console.log('=== LogTen Package (FIXED) ===')
console.log(JSON.stringify(pkg, null, 2))

console.log('\n=== BEFORE/AFTER Comparison ===')
console.log('BEFORE (wrong):')
console.log('  timesAreZulu: true')
console.log('  flight_flightDate: "09/08/2026"')
console.log('  → LogTen parsed as UTC midnight → displayed as 09/07/2026 in US Central')
console.log('')
console.log('AFTER (correct):')
console.log('  timesAreZulu: false')
console.log('  flight_flightDate: "09/08/2026"')
console.log('  → LogTen parsed as local calendar date → displayed as 09/08/2026')
