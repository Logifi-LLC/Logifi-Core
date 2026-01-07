// Type definitions for FAA Form 8710-1

export interface Form8710SectionI {
  name: string
  dateOfBirth: string // MM/DD/YYYY format
  placeOfBirth: string // City, State or City, Country
  residentialAddress: string
  residentialCity: string
  residentialState: string
  residentialZip: string
  mailingAddress?: string
  mailingCity?: string
  mailingState?: string
  mailingZip?: string
  certificateNumber?: string
}

export interface Form8710SectionII {
  // Recent experience totals
  last6Months: TimeTotals
  last12Months: TimeTotals
  last24Months: TimeTotals
  allTime: TimeTotals
}

export interface TimeTotals {
  totalTime: number
  picTime: number
  sicTime: number
  instructionReceived: number
  soloTime: number
  crossCountryTime: number
  instrumentTime: number
  nightTime: number
}

// Aircraft category types matching 8710 form
export type AircraftCategory8710 = 
  | 'airplane-sel'    // Airplane Single Engine Land
  | 'airplane-mel'    // Airplane Multi Engine Land
  | 'airplane-ses'    // Airplane Single Engine Sea
  | 'airplane-mes'    // Airplane Multi Engine Sea
  | 'rotorcraft-heli' // Rotorcraft Helicopter
  | 'rotorcraft-gyro' // Rotorcraft Gyroplane
  | 'glider'          // Glider
  | 'lta-balloon'     // Lighter-than-air Balloon
  | 'lta-airship'     // Lighter-than-air Airship
  | 'powered-lift'    // Powered Lift
  | 'ffs'             // Full Flight Simulator
  | 'ftd'             // Flight Training Device
  | 'atd'             // Aviation Training Device

// Flight time breakdown for each category/class
export interface CategoryFlightTimes {
  category: AircraftCategory8710
  // Basic counts
  totalFlights: number
  
  // Instruction Received (dual time)
  instructionReceived: number
  
  // Solo time
  solo: number
  
  // PIC and SIC time
  pic: number
  sic: number
  
  // Cross Country breakdowns
  crossCountryInstructionReceived: number
  crossCountrySolo: number
  crossCountryPic: number
  crossCountrySic: number
  
  // Instrument time
  instrument: number // actual + simulated combined
  
  // Night time breakdowns
  nightInstructionReceived: number
  nightTakeoffsLandings: number // number of takeoffs/landings
  nightPic: number
  nightSic: number
  nightTakeoffsLandingsPic: number // takeoffs/landings while PIC
  nightTakeoffsLandingsSic: number // takeoffs/landings while SIC
  
  // Glider specific
  aeroTowFlights?: number
  groundLaunchFlights?: number
  poweredLaunchFlights?: number
}

export interface Form8710SectionIII {
  categories: CategoryFlightTimes[]
}

export interface ComplianceMetadata {
  totalEntries: number
  importedEntries: number
  manualEntries: number
  importBatches: Array<{
    batchId?: string
    sourceType: string
    entryCount: number
    dateRange?: { start: string; end: string }
    importedAt?: string
  }>
}

export interface Form8710Data {
  sectionI: Form8710SectionI
  sectionII: Form8710SectionII
  sectionIII: Form8710SectionIII
  complianceMetadata?: ComplianceMetadata
}

// Mapping from logbook category/class to 8710 categories
export function mapCategoryTo8710(categoryClass: string): AircraftCategory8710 | null {
  const normalized = categoryClass.toUpperCase().trim()
  
  if (normalized === 'ASEL') return 'airplane-sel'
  if (normalized === 'AMEL') return 'airplane-mel'
  if (normalized === 'ASES') return 'airplane-ses'
  if (normalized === 'AMES') return 'airplane-mes'
  if (normalized === 'HELI' || normalized.includes('HELICOPTER')) return 'rotorcraft-heli'
  if (normalized === 'GYRO' || normalized.includes('GYRO')) return 'rotorcraft-gyro'
  if (normalized === 'GLID' || normalized.includes('GLIDER')) return 'glider'
  if (normalized === 'BAL' || normalized.includes('BALLOON')) return 'lta-balloon'
  if (normalized === 'AIRS' || normalized.includes('AIRSHIP')) return 'lta-airship'
  if (normalized === 'PL' || normalized.includes('POWERED LIFT')) return 'powered-lift'
  
  // Training devices - may need to be detected from aircraft make/model or training elements
  if (normalized.includes('FFS') || normalized.includes('FULL FLIGHT SIM')) return 'ffs'
  if (normalized.includes('FTD') || normalized.includes('FLIGHT TRAINING DEVICE')) return 'ftd'
  if (normalized.includes('ATD') || normalized.includes('AVIATION TRAINING DEVICE')) return 'atd'
  
  return null
}

// Helper to check if an entry represents a training device
export function isTrainingDevice(entry: {
  aircraftMakeModel: string
  trainingElements?: string
  aircraftCategoryClass: string
}): boolean {
  const makeModel = entry.aircraftMakeModel.toUpperCase()
  const training = entry.trainingElements?.toUpperCase() || ''
  const category = entry.aircraftCategoryClass.toUpperCase()
  
  // Check for common simulator/device patterns
  const simulatorPatterns = [
    'SIMULATOR', 'SIM', 'FFS', 'FTD', 'ATD', 'FRASCA', 'REDBIRD',
    'GAT', 'ELITE', 'PRECISION', 'ALSIM', 'TRUFLIGHT'
  ]
  
  return simulatorPatterns.some(pattern => 
    makeModel.includes(pattern) || training.includes(pattern) || category.includes(pattern)
  )
}

