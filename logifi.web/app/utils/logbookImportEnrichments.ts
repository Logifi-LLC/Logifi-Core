import type { LogEntry } from './logbookTypes'
import { findFieldValue } from '../../shared/logbookDataBridge/importMappers'
import { namesMatchFlexible } from '../../shared/logbookDataBridge/logtenDynamicExport'

const PIC_CREW_FIELDS = ['flight_selectedCrewPIC', 'PIC/P1 Crew', 'pic/p1 crew']
const SIC_CREW_FIELDS = ['flight_selectedCrewSIC', 'SIC/P2 Crew', 'sic/p2 crew']

type CrewCandidateRole = 'instructor' | 'student' | 'pic' | 'sic' | 'other'
type ImporterSeat = 'PIC' | 'SIC' | 'Instructor' | 'Student' | ''

type CrewCandidate = {
  name: string
  role: CrewCandidateRole
  priority: number
}

function toTitleCase(str: string): string {
  if (!str || !str.trim()) return str
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isUserName(name: string, userName: string): boolean {
  if (!name || !name.trim() || !userName) return false
  return namesMatchFlexible(name, userName)
}

/** Infer which seat the importing pilot occupied for this flight. */
export function inferImporterSeat(
  entry: LogEntry,
  picCrew: string,
  sicCrew: string,
  userName: string,
  instructorCrew = '',
  studentCrew = ''
): ImporterSeat {
  if (userName && picCrew && namesMatchFlexible(picCrew, userName)) return 'PIC'
  if (userName && sicCrew && namesMatchFlexible(sicCrew, userName)) return 'SIC'
  if (userName && instructorCrew && namesMatchFlexible(instructorCrew, userName)) {
    return 'Instructor'
  }
  if (userName && studentCrew && namesMatchFlexible(studentCrew, userName)) return 'Student'

  const picTime = entry.flightTime.pic ?? 0
  const sicTime = entry.flightTime.sic ?? 0

  if (picTime > 0 && sicTime <= 0) return 'PIC'
  if (sicTime > 0 && picTime <= 0) {
    if (picCrew && sicCrew) return 'PIC'
    return 'SIC'
  }

  if (entry.role === 'PIC') return 'PIC'
  if (entry.role === 'SIC') return 'SIC'

  return ''
}

function pickOtherCrewName(seat: ImporterSeat, candidates: CrewCandidate[]): string {
  if (seat === 'PIC') {
    return (
      candidates.find((c) => c.role === 'sic')?.name ||
      candidates.find((c) => c.role === 'instructor')?.name ||
      candidates.find((c) => c.role === 'student')?.name ||
      candidates[0]?.name ||
      ''
    )
  }
  if (seat === 'SIC') {
    return (
      candidates.find((c) => c.role === 'pic')?.name ||
      candidates.find((c) => c.role === 'instructor')?.name ||
      candidates.find((c) => c.role === 'student')?.name ||
      candidates[0]?.name ||
      ''
    )
  }
  if (seat === 'Instructor') {
    return (
      candidates.find((c) => c.role === 'student')?.name ||
      candidates.find((c) => c.role === 'pic')?.name ||
      candidates.find((c) => c.role === 'sic')?.name ||
      candidates[0]?.name ||
      ''
    )
  }
  if (seat === 'Student') {
    return (
      candidates.find((c) => c.role === 'instructor')?.name ||
      candidates.find((c) => c.role === 'pic')?.name ||
      candidates.find((c) => c.role === 'sic')?.name ||
      candidates[0]?.name ||
      ''
    )
  }

  const sorted = [...candidates].sort((a, b) => {
    const rolePriority: Record<string, number> = {
      instructor: 1,
      student: 2,
      pic: 3,
      sic: 4,
      other: 5,
    }
    return (
      (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99) || a.priority - b.priority
    )
  })
  return sorted[0]?.name || ''
}

function roleLabelForCrewName(
  selectedName: string,
  picCrew: string,
  sicCrew: string,
  instructorCrew: string,
  studentCrew: string,
  firstOfficerName: string
): string {
  const normalized = selectedName.trim().toLowerCase()
  if (instructorCrew && instructorCrew.trim().toLowerCase() === normalized) {
    return 'Instructor'
  }
  if (studentCrew && studentCrew.trim().toLowerCase() === normalized) {
    return 'Student'
  }
  if (picCrew && picCrew.trim().toLowerCase() === normalized) {
    return 'Captain'
  }
  if (sicCrew && sicCrew.trim().toLowerCase() === normalized) {
    return 'First Officer'
  }
  if (firstOfficerName && firstOfficerName.trim().toLowerCase() === normalized) {
    return 'First Officer'
  }
  return ''
}

function buildCrewCandidates(
  rawEntry: Record<string, unknown>,
  userName: string
): {
  picCrew: string
  sicCrew: string
  instructorCrew: string
  studentCrew: string
  firstOfficerName: string
  candidates: CrewCandidate[]
} {
  const picCrew = findFieldValue(rawEntry, PIC_CREW_FIELDS)
  const sicCrew = findFieldValue(rawEntry, SIC_CREW_FIELDS)
  const instructorCrew = findFieldValue(rawEntry, ['flight_selectedCrewInstructor'])
  const studentCrew = findFieldValue(rawEntry, ['flight_selectedCrewStudent'])
  const firstOfficerName = findFieldValue(rawEntry, [
    'First Officer Name',
    'first officer name',
    'FirstOfficerName',
    'firstOfficerName',
  ])
  const trainingElementsField = findFieldValue(rawEntry, [
    'Training Elements',
    'training elements',
    'TrainingElements',
    'trainingElements',
  ])
  const trainingInstructorField = findFieldValue(rawEntry, [
    'Training Instructor',
    'training instructor',
    'TrainingInstructor',
    'trainingInstructor',
  ])

  let flightPropertiesPilot = ''
  const flightProperties = findFieldValue(rawEntry, [
    'Flight Properties',
    'flight properties',
    'FlightProperties',
    'flightProperties',
  ])
  if (flightProperties) {
    const firstOfficerMatch = flightProperties.match(/First\s+Officer\s*:\s*([^;]+)/i)
    if (firstOfficerMatch?.[1]) {
      flightPropertiesPilot = firstOfficerMatch[1].trim()
    }
  }

  const candidates: CrewCandidate[] = []
  if (instructorCrew && !isUserName(instructorCrew, userName)) {
    candidates.push({ name: instructorCrew, role: 'instructor', priority: 1 })
  }
  if (studentCrew && !isUserName(studentCrew, userName)) {
    candidates.push({ name: studentCrew, role: 'student', priority: 2 })
  }
  if (picCrew && !isUserName(picCrew, userName)) {
    candidates.push({ name: picCrew, role: 'pic', priority: 3 })
  }
  if (sicCrew && !isUserName(sicCrew, userName)) {
    candidates.push({ name: sicCrew, role: 'sic', priority: 4 })
  }
  if (firstOfficerName && !isUserName(firstOfficerName, userName)) {
    candidates.push({ name: firstOfficerName, role: 'other', priority: 5 })
  }
  if (flightPropertiesPilot && !isUserName(flightPropertiesPilot, userName)) {
    candidates.push({ name: flightPropertiesPilot, role: 'other', priority: 6 })
  }
  if (trainingElementsField && !isUserName(trainingElementsField, userName)) {
    candidates.push({ name: trainingElementsField, role: 'other', priority: 7 })
  }
  if (trainingInstructorField && !isUserName(trainingInstructorField, userName)) {
    candidates.push({ name: trainingInstructorField, role: 'other', priority: 8 })
  }

  return {
    picCrew,
    sicCrew,
    instructorCrew,
    studentCrew,
    firstOfficerName,
    candidates,
  }
}

/** LogTen crew-field heuristics that depend on the logged-in pilot profile. */
export function applyLogtenCrewFields(
  entry: LogEntry,
  rawEntry: Record<string, unknown>,
  pilotName: string
): void {
  const userName = (pilotName || '').trim()
  const crew = buildCrewCandidates(rawEntry, userName)
  const seat = inferImporterSeat(
    entry,
    crew.picCrew,
    crew.sicCrew,
    userName,
    crew.instructorCrew,
    crew.studentCrew
  )

  const selectedPilot = pickOtherCrewName(seat, crew.candidates)
  entry.trainingElements = toTitleCase(selectedPilot)

  const explicitInstructor = findFieldValue(rawEntry, [
    'Training Instructor',
    'training instructor',
    'TrainingInstructor',
    'trainingInstructor',
  ])
  if (explicitInstructor && !isUserName(explicitInstructor, userName)) {
    const normalizedName = explicitInstructor.trim().toLowerCase()
    if (crew.instructorCrew && crew.instructorCrew.trim().toLowerCase() === normalizedName) {
      entry.trainingInstructor = 'Instructor'
      return
    }
    if (crew.studentCrew && crew.studentCrew.trim().toLowerCase() === normalizedName) {
      entry.trainingInstructor = 'Student'
      return
    }
    if (crew.picCrew && crew.picCrew.trim().toLowerCase() === normalizedName) {
      entry.trainingInstructor = 'Captain'
      return
    }
    if (crew.sicCrew && crew.sicCrew.trim().toLowerCase() === normalizedName) {
      entry.trainingInstructor = 'First Officer'
      return
    }
    entry.trainingInstructor = 'Instructor'
    return
  }

  entry.trainingInstructor = selectedPilot
    ? roleLabelForCrewName(
        selectedPilot,
        crew.picCrew,
        crew.sicCrew,
        crew.instructorCrew,
        crew.studentCrew,
        crew.firstOfficerName
      )
    : ''
}
