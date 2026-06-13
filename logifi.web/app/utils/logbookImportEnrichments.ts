import type { LogEntry } from './logbookTypes'
import { findFieldValue } from '../../shared/logbookDataBridge/importMappers'

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
  return name.trim().toLowerCase() === userName.trim().toLowerCase()
}

/** LogTen crew-field heuristics that depend on the logged-in pilot profile. */
export function applyLogtenCrewFields(
  entry: LogEntry,
  rawEntry: Record<string, unknown>,
  pilotName: string
): void {
  const userName = (pilotName || '').trim()

  entry.trainingElements = (() => {
    const picCrew = findFieldValue(rawEntry, ['flight_selectedCrewPIC'])
    const sicCrew = findFieldValue(rawEntry, ['flight_selectedCrewSIC'])
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

    const candidates: Array<{
      name: string
      role: 'instructor' | 'student' | 'pic' | 'sic' | 'other'
      priority: number
    }> = []

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

    if (!userName) {
      candidates.sort((a, b) => {
        const rolePriority: Record<string, number> = {
          instructor: 1,
          student: 2,
          pic: 3,
          sic: 4,
          other: 5,
        }
        return (
          (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99) ||
          a.priority - b.priority
        )
      })
      return toTitleCase(candidates[0]?.name || '')
    }

    const userIsPIC = userName && picCrew && isUserName(picCrew, userName)
    const userIsSIC = userName && sicCrew && isUserName(sicCrew, userName)
    const userIsInstructor =
      userName && instructorCrew && isUserName(instructorCrew, userName)
    const userIsStudent = userName && studentCrew && isUserName(studentCrew, userName)

    let selectedPilot = ''
    if (userIsPIC) {
      selectedPilot =
        candidates.find((c) => c.role === 'sic')?.name ||
        candidates.find((c) => c.role === 'instructor')?.name ||
        candidates.find((c) => c.role === 'student')?.name ||
        candidates[0]?.name ||
        ''
    } else if (userIsSIC) {
      selectedPilot =
        candidates.find((c) => c.role === 'pic')?.name ||
        candidates.find((c) => c.role === 'instructor')?.name ||
        candidates.find((c) => c.role === 'student')?.name ||
        candidates[0]?.name ||
        ''
    } else if (userIsInstructor) {
      selectedPilot =
        candidates.find((c) => c.role === 'student')?.name ||
        candidates.find((c) => c.role === 'pic')?.name ||
        candidates.find((c) => c.role === 'sic')?.name ||
        candidates[0]?.name ||
        ''
    } else if (userIsStudent) {
      selectedPilot =
        candidates.find((c) => c.role === 'instructor')?.name ||
        candidates.find((c) => c.role === 'pic')?.name ||
        candidates.find((c) => c.role === 'sic')?.name ||
        candidates[0]?.name ||
        ''
    } else {
      candidates.sort((a, b) => {
        const rolePriority: Record<string, number> = {
          instructor: 1,
          student: 2,
          pic: 3,
          sic: 4,
          other: 5,
        }
        return (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
      })
      selectedPilot = candidates[0]?.name || ''
    }

    return toTitleCase(selectedPilot)
  })()

  entry.trainingInstructor = (() => {
    const explicitInstructor = findFieldValue(rawEntry, [
      'Training Instructor',
      'training instructor',
      'TrainingInstructor',
      'trainingInstructor',
    ])
    const instructorCrew = findFieldValue(rawEntry, ['flight_selectedCrewInstructor'])
    const studentCrew = findFieldValue(rawEntry, ['flight_selectedCrewStudent'])
    const picCrew = findFieldValue(rawEntry, ['flight_selectedCrewPIC'])
    const sicCrew = findFieldValue(rawEntry, ['flight_selectedCrewSIC'])
    const firstOfficerName = findFieldValue(rawEntry, [
      'First Officer Name',
      'first officer name',
      'FirstOfficerName',
      'firstOfficerName',
    ])

    if (explicitInstructor && !isUserName(explicitInstructor, userName)) {
      const normalizedName = explicitInstructor.trim().toLowerCase()
      if (instructorCrew && instructorCrew.trim().toLowerCase() === normalizedName) {
        return 'Instructor'
      }
      if (studentCrew && studentCrew.trim().toLowerCase() === normalizedName) {
        return 'Student'
      }
      if (picCrew && picCrew.trim().toLowerCase() === normalizedName) {
        return 'Captain'
      }
      if (sicCrew && sicCrew.trim().toLowerCase() === normalizedName) {
        return 'First Officer'
      }
      return 'Instructor'
    }

    const trainingElementsField = findFieldValue(rawEntry, [
      'Training Elements',
      'training elements',
      'TrainingElements',
      'trainingElements',
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

    const candidates: Array<{
      name: string
      role: 'instructor' | 'student' | 'pic' | 'sic' | 'other'
    }> = []
    if (instructorCrew && !isUserName(instructorCrew, userName)) {
      candidates.push({ name: instructorCrew, role: 'instructor' })
    }
    if (studentCrew && !isUserName(studentCrew, userName)) {
      candidates.push({ name: studentCrew, role: 'student' })
    }
    if (picCrew && !isUserName(picCrew, userName)) {
      candidates.push({ name: picCrew, role: 'pic' })
    }
    if (sicCrew && !isUserName(sicCrew, userName)) {
      candidates.push({ name: sicCrew, role: 'sic' })
    }
    if (firstOfficerName && !isUserName(firstOfficerName, userName)) {
      candidates.push({ name: firstOfficerName, role: 'other' })
    }
    if (flightPropertiesPilot && !isUserName(flightPropertiesPilot, userName)) {
      candidates.push({ name: flightPropertiesPilot, role: 'other' })
    }
    if (trainingElementsField && !isUserName(trainingElementsField, userName)) {
      candidates.push({ name: trainingElementsField, role: 'other' })
    }

    const userIsPIC = userName && picCrew && isUserName(picCrew, userName)
    const userIsSIC = userName && sicCrew && isUserName(sicCrew, userName)
    const userIsInstructor =
      userName && instructorCrew && isUserName(instructorCrew, userName)
    const userIsStudent = userName && studentCrew && isUserName(studentCrew, userName)

    let selectedPilotName = ''
    if (userIsPIC) {
      selectedPilotName =
        candidates.find((c) => c.role === 'sic')?.name ||
        candidates.find((c) => c.role === 'instructor')?.name ||
        candidates.find((c) => c.role === 'student')?.name ||
        candidates[0]?.name ||
        ''
    } else if (userIsSIC) {
      selectedPilotName =
        candidates.find((c) => c.role === 'pic')?.name ||
        candidates.find((c) => c.role === 'instructor')?.name ||
        candidates.find((c) => c.role === 'student')?.name ||
        candidates[0]?.name ||
        ''
    } else if (userIsInstructor) {
      selectedPilotName =
        candidates.find((c) => c.role === 'student')?.name ||
        candidates.find((c) => c.role === 'pic')?.name ||
        candidates.find((c) => c.role === 'sic')?.name ||
        candidates[0]?.name ||
        ''
    } else if (userIsStudent) {
      selectedPilotName =
        candidates.find((c) => c.role === 'instructor')?.name ||
        candidates.find((c) => c.role === 'pic')?.name ||
        candidates.find((c) => c.role === 'sic')?.name ||
        candidates[0]?.name ||
        ''
    } else {
      candidates.sort((a, b) => {
        const rolePriority: Record<string, number> = {
          instructor: 1,
          student: 2,
          pic: 3,
          sic: 4,
          other: 5,
        }
        return (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
      })
      selectedPilotName = candidates[0]?.name || ''
    }

    if (!selectedPilotName) return ''

    const normalizedPilotName = selectedPilotName.trim().toLowerCase()
    if (instructorCrew && instructorCrew.trim().toLowerCase() === normalizedPilotName) {
      return 'Instructor'
    }
    if (studentCrew && studentCrew.trim().toLowerCase() === normalizedPilotName) {
      return 'Student'
    }
    if (picCrew && picCrew.trim().toLowerCase() === normalizedPilotName) {
      return 'Captain'
    }
    if (sicCrew && sicCrew.trim().toLowerCase() === normalizedPilotName) {
      return 'First Officer'
    }
    if (firstOfficerName && firstOfficerName.trim().toLowerCase() === normalizedPilotName) {
      return 'First Officer'
    }
    return ''
  })()
}
