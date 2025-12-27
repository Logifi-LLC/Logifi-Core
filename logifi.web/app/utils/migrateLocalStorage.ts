import { supabase } from '~/lib/supabase'
import { LOGBOOK_STORAGE_KEY } from '~/utils/logbookTypes'
import type { LogEntry } from '~/utils/logbookTypes'

const PILOT_PROFILE_STORAGE_KEY = 'logifi://pilot-profile'
const CREW_PROFILES_STORAGE_KEY = 'logifi://crew-profiles'
const MIGRATION_STATUS_KEY = 'logifi://migration-status'

interface MigrationStatus {
  completed: boolean
  migratedAt: string
  entriesCount: number
  profileMigrated: boolean
  crewProfilesMigrated: boolean
}

interface PilotProfilePrefs {
  name?: string
  callsign?: string
  homeBase?: string
  certificates?: string
  flightGoals?: string
  notes?: string
  dateOfBirth?: string
  placeOfBirth?: string
  residentialAddress?: string
  residentialCity?: string
  residentialState?: string
  residentialZip?: string
  mailingAddress?: string
  mailingCity?: string
  mailingState?: string
  mailingZip?: string
  certificateNumber?: string
}

interface CrewProfile {
  name: string
  notes?: string
  lastUpdated?: string
  certificateNumber?: string
  certificateType?: string
}

/**
 * Check if migration has already been completed
 */
export const hasMigrationCompleted = (): boolean => {
  if (typeof window === 'undefined') return false
  
  try {
    const status = window.localStorage.getItem(MIGRATION_STATUS_KEY)
    if (!status) return false
    
    const parsed: MigrationStatus = JSON.parse(status)
    return parsed.completed === true
  } catch {
    return false
  }
}

/**
 * Get migration status
 */
export const getMigrationStatus = (): MigrationStatus | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const status = window.localStorage.getItem(MIGRATION_STATUS_KEY)
    if (!status) return null
    return JSON.parse(status)
  } catch {
    return null
  }
}

/**
 * Mark migration as completed
 */
const markMigrationComplete = (entriesCount: number, profileMigrated: boolean, crewProfilesMigrated: boolean) => {
  if (typeof window === 'undefined') return
  
  const status: MigrationStatus = {
    completed: true,
    migratedAt: new Date().toISOString(),
    entriesCount,
    profileMigrated,
    crewProfilesMigrated
  }
  
  window.localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status))
}

/**
 * Clear migration status (allows re-migration)
 */
export const clearMigrationStatus = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(MIGRATION_STATUS_KEY)
  console.log('Migration status cleared. Migration will run again on next login.')
}

/**
 * Delete all log entries from Supabase for the current user
 * Use this to clean up duplicates before re-running migration
 */
export const clearAllSupabaseEntries = async (userId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('log_entries')
      .delete()
      .eq('user_id', userId)
      .select()
    
    if (error) {
      console.error('Error clearing entries:', error)
      return { success: false, error: error.message }
    }
    
    const deletedCount = data?.length || 0
    console.log(`Cleared ${deletedCount} entries from Supabase`)
    return { success: true, deletedCount }
  } catch (error) {
    console.error('Error clearing entries:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Reset migration: Clear all Supabase entries and migration status
 * This allows a fresh migration to run
 */
export const resetMigration = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Clear all entries from Supabase
    const clearResult = await clearAllSupabaseEntries(userId)
    if (!clearResult.success) {
      return { success: false, error: clearResult.error }
    }
    
    // Clear migration status
    clearMigrationStatus()
    
    console.log('Migration reset complete. Refresh the page to trigger a fresh migration.')
    return { success: true }
  } catch (error) {
    console.error('Error resetting migration:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Convert LogEntry to database format
 */
const convertLogEntryToDb = (entry: LogEntry, userId: string) => {
  return {
    user_id: userId,
    date: entry.date,
    role: entry.role,
    aircraft_category_class: entry.aircraftCategoryClass,
    category_class_time: entry.categoryClassTime,
    aircraft_make_model: entry.aircraftMakeModel,
    registration: entry.registration,
    flight_number: entry.flightNumber || null,
    departure: entry.departure,
    destination: entry.destination,
    route: entry.route || null,
    training_elements: entry.trainingElements || null,
    training_instructor: entry.trainingInstructor || null,
    instructor_certificate: entry.instructorCertificate || null,
    flight_conditions: entry.flightConditions || [],
    remarks: entry.remarks || null,
    flight_time: entry.flightTime,
    performance: entry.performance,
    oooi: entry.oooi || null,
    flagged: entry.flagged || false,
    is_imported: true,
    import_source: 'localStorage',
    import_metadata: {
      originalId: entry.id,
      migratedAt: new Date().toISOString()
    }
  }
}

/**
 * Migrate logbook entries from localStorage to Supabase
 */
const migrateLogEntries = async (userId: string, onProgress?: (current: number, total: number) => void): Promise<number> => {
  if (typeof window === 'undefined') return 0
  
  try {
    const stored = window.localStorage.getItem(LOGBOOK_STORAGE_KEY)
    if (!stored) return 0
    
    const entries: LogEntry[] = JSON.parse(stored)
    if (!Array.isArray(entries) || entries.length === 0) return 0
    
    // Batch insert entries (100 at a time)
    const batchSize = 100
    let migratedCount = 0
    
    // First, check what entries already exist in Supabase to avoid duplicates
    const { data: existingEntries } = await supabase
      .from('log_entries')
      .select('import_metadata')
      .eq('user_id', userId)
      .eq('is_imported', true)
      .eq('import_source', 'localStorage')
    
    const existingOriginalIds = new Set(
      existingEntries?.map((e: any) => e.import_metadata?.originalId).filter(Boolean) || []
    )
    
    // Filter out entries that have already been migrated
    const entriesToMigrate = entries.filter(entry => !existingOriginalIds.has(entry.id))
    
    if (entriesToMigrate.length === 0) {
      console.log('All entries already migrated, skipping migration')
      return 0
    }
    
    console.log(`Migrating ${entriesToMigrate.length} new entries (${entries.length - entriesToMigrate.length} already migrated)`)
    
    for (let i = 0; i < entriesToMigrate.length; i += batchSize) {
      const batch = entriesToMigrate.slice(i, i + batchSize)
      const dbEntries = batch.map(entry => convertLogEntryToDb(entry, userId))
      
      const { error } = await supabase
        .from('log_entries')
        .insert(dbEntries)
      
      if (error) {
        console.error(`Error migrating batch ${i / batchSize + 1}:`, error)
        // Continue with next batch even if one fails
        continue
      }
      
      migratedCount += batch.length
      onProgress?.(migratedCount, entriesToMigrate.length)
    }
    
    return migratedCount
  } catch (error) {
    console.error('Error migrating log entries:', error)
    return 0
  }
}

/**
 * Migrate pilot profile from localStorage to user_profiles
 */
const migratePilotProfile = async (userId: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  
  try {
    const stored = window.localStorage.getItem(PILOT_PROFILE_STORAGE_KEY)
    if (!stored) return false
    
    const profile: PilotProfilePrefs = JSON.parse(stored)
    if (!profile) return false
    
    // Map localStorage profile to user_profiles schema
    const updateData: any = {}
    
    if (profile.name) updateData.full_name = profile.name
    if (profile.certificateNumber) updateData.certificate_number = profile.certificateNumber
    if (profile.dateOfBirth) updateData.date_of_birth = profile.dateOfBirth
    if (profile.placeOfBirth) updateData.place_of_birth = profile.placeOfBirth
    
    // Addresses as JSONB
    if (profile.residentialAddress || profile.residentialCity || profile.residentialState || profile.residentialZip) {
      updateData.residential_address = {
        street: profile.residentialAddress || '',
        city: profile.residentialCity || '',
        state: profile.residentialState || '',
        zip: profile.residentialZip || ''
      }
    }
    
    if (profile.mailingAddress || profile.mailingCity || profile.mailingState || profile.mailingZip) {
      updateData.mailing_address = {
        street: profile.mailingAddress || '',
        city: profile.mailingCity || '',
        state: profile.mailingState || '',
        zip: profile.mailingZip || ''
      }
    }
    
    // Store other preferences in preferences JSONB
    const preferences: any = {}
    if (profile.callsign) preferences.callsign = profile.callsign
    if (profile.homeBase) preferences.homeBase = profile.homeBase
    if (profile.certificates) preferences.certificates = profile.certificates
    if (profile.flightGoals) preferences.flightGoals = profile.flightGoals
    if (profile.notes) preferences.notes = profile.notes
    
    if (Object.keys(preferences).length > 0) {
      updateData.preferences = preferences
    }
    
    // Only update if we have data to update
    if (Object.keys(updateData).length === 0) return false
    
    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
    
    if (error) {
      console.error('Error migrating pilot profile:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error migrating pilot profile:', error)
    return false
  }
}

/**
 * Migrate crew profiles from localStorage to crew_profiles table
 */
const migrateCrewProfiles = async (userId: string): Promise<number> => {
  if (typeof window === 'undefined') return 0
  
  try {
    const stored = window.localStorage.getItem(CREW_PROFILES_STORAGE_KEY)
    if (!stored) return 0
    
    const crewProfiles: Record<string, CrewProfile> = JSON.parse(stored)
    if (!crewProfiles || typeof crewProfiles !== 'object') return 0
    
    const profiles = Object.entries(crewProfiles).map(([name, profile]) => ({
      user_id: userId,
      name: profile.name || name,
      certificate_number: profile.certificateNumber || null,
      certificate_type: profile.certificateType || null,
      notes: profile.notes || null
    }))
    
    if (profiles.length === 0) return 0
    
    // Insert crew profiles (handle duplicates gracefully)
    const { error } = await supabase
      .from('crew_profiles')
      .upsert(profiles, { onConflict: 'user_id,name' })
    
    if (error) {
      console.error('Error migrating crew profiles:', error)
      return 0
    }
    
    return profiles.length
  } catch (error) {
    console.error('Error migrating crew profiles:', error)
    return 0
  }
}

/**
 * Main migration function
 * Migrates all localStorage data to Supabase
 */
export const migrateLocalStorageToSupabase = async (
  userId: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<{
  success: boolean
  entriesMigrated: number
  profileMigrated: boolean
  crewProfilesMigrated: number
  error?: string
}> => {
  try {
    // Check if already migrated
    if (hasMigrationCompleted()) {
      const status = getMigrationStatus()
      return {
        success: true,
        entriesMigrated: status?.entriesCount || 0,
        profileMigrated: status?.profileMigrated || false,
        crewProfilesMigrated: 0
      }
    }
    
    // Migrate log entries
    onProgress?.('entries', 0, 0)
    const entriesCount = await migrateLogEntries(userId, (current, total) => {
      onProgress?.('entries', current, total)
    })
    
    // Migrate pilot profile
    onProgress?.('profile', 0, 1)
    const profileMigrated = await migratePilotProfile(userId)
    onProgress?.('profile', 1, 1)
    
    // Migrate crew profiles
    onProgress?.('crew', 0, 0)
    const crewCount = await migrateCrewProfiles(userId)
    onProgress?.('crew', crewCount, crewCount)
    
    // Mark migration as complete
    markMigrationComplete(entriesCount, profileMigrated, crewCount > 0)
    
    return {
      success: true,
      entriesMigrated: entriesCount,
      profileMigrated,
      crewProfilesMigrated: crewCount
    }
  } catch (error) {
    console.error('Migration error:', error)
    return {
      success: false,
      entriesMigrated: 0,
      profileMigrated: false,
      crewProfilesMigrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error during migration'
    }
  }
}

