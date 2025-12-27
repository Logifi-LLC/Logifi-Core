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
 * Merge duplicate crew profiles (case-insensitive)
 * Updates all log entries to use the canonical name and deletes duplicates
 */
export const mergeDuplicateCrewProfiles = async (
  userId: string,
  canonicalName: string,
  duplicateName: string,
  updateLogEntries: (oldName: string, newName: string) => Promise<void>
): Promise<{ success: boolean; entriesUpdated: number; error?: string }> => {
  if (typeof window === 'undefined') {
    return { success: false, entriesUpdated: 0, error: 'Not in browser environment' }
  }
  
  try {
    // Get both profiles
    const { data: profiles, error: fetchError } = await supabase
      .from('crew_profiles')
      .select('*')
      .eq('user_id', userId)
      .in('name', [canonicalName, duplicateName])
    
    if (fetchError) {
      return { success: false, entriesUpdated: 0, error: fetchError.message }
    }
    
    if (!profiles || profiles.length === 0) {
      return { success: false, entriesUpdated: 0, error: 'Profiles not found' }
    }
    
    // Find the canonical and duplicate profiles
    const canonicalProfile = profiles.find(p => p.name === canonicalName)
    const duplicateProfile = profiles.find(p => p.name === duplicateName)
    
    if (!canonicalProfile || !duplicateProfile) {
      return { success: false, entriesUpdated: 0, error: 'One or both profiles not found' }
    }
    
    // Merge notes (combine non-empty notes)
    const mergedNotes = [
      canonicalProfile.notes,
      duplicateProfile.notes
    ].filter(n => n && n.trim()).join('\n\n')
    
    // Update canonical profile with merged data
    const { error: updateError } = await supabase
      .from('crew_profiles')
      .update({
        notes: mergedNotes || null,
        certificate_number: canonicalProfile.certificate_number || duplicateProfile.certificate_number || null,
        certificate_type: canonicalProfile.certificate_type || duplicateProfile.certificate_type || null
      })
      .eq('id', canonicalProfile.id)
    
    if (updateError) {
      return { success: false, entriesUpdated: 0, error: updateError.message }
    }
    
    // Update all log entries that reference the duplicate name
    await updateLogEntries(duplicateName, canonicalName)
    
    // Delete the duplicate profile
    const { error: deleteError } = await supabase
      .from('crew_profiles')
      .delete()
      .eq('id', duplicateProfile.id)
    
    if (deleteError) {
      console.warn('Failed to delete duplicate profile:', deleteError)
      // Don't fail the whole operation if delete fails
    }
    
    console.log(`[MergeDuplicateCrewProfiles] Merged "${duplicateName}" into "${canonicalName}"`)
    
    return { success: true, entriesUpdated: 0 } // entriesUpdated would need to be tracked by updateLogEntries
  } catch (error) {
    console.error('Error merging duplicate crew profiles:', error)
    return { success: false, entriesUpdated: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Find and list all duplicate crew profiles (case-insensitive)
 */
export const findDuplicateCrewProfiles = async (userId: string): Promise<{ duplicates: Array<{ names: string[] }>, error?: string }> => {
  if (typeof window === 'undefined') {
    return { duplicates: [], error: 'Not in browser environment' }
  }
  
  try {
    const { data: profiles, error } = await supabase
      .from('crew_profiles')
      .select('name')
      .eq('user_id', userId)
    
    if (error) {
      return { duplicates: [], error: error.message }
    }
    
    if (!profiles || profiles.length === 0) {
      return { duplicates: [] }
    }
    
    // Group by case-insensitive name
    const nameGroups = new Map<string, string[]>()
    profiles.forEach((p: any) => {
      const lowerName = p.name.toLowerCase()
      if (!nameGroups.has(lowerName)) {
        nameGroups.set(lowerName, [])
      }
      nameGroups.get(lowerName)!.push(p.name)
    })
    
    // Find groups with multiple entries (duplicates)
    const duplicates = Array.from(nameGroups.values())
      .filter(names => names.length > 1)
      .map(names => ({ names }))
    
    return { duplicates }
  } catch (error) {
    console.error('Error finding duplicate crew profiles:', error)
    return { duplicates: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Extract unique crew names from log entries and migrate them to crew_profiles
 * This ensures all crew members mentioned in log entries have profiles
 */
export const migrateCrewFromLogEntries = async (userId: string, logEntries: any[]): Promise<{ success: boolean; migrated: number; error?: string }> => {
  if (typeof window === 'undefined') {
    return { success: false, migrated: 0, error: 'Not in browser environment' }
  }
  
  try {
    // Extract unique crew names from log entries
    const crewNames = new Set<string>()
    logEntries.forEach(entry => {
      if (entry.trainingElements && entry.trainingElements.trim()) {
        crewNames.add(entry.trainingElements.trim())
      }
    })
    
    console.log(`[MigrateCrewFromLogEntries] Found ${crewNames.size} unique crew names in log entries`)
    
    if (crewNames.size === 0) {
      return { success: true, migrated: 0 }
    }
    
    // Get existing crew profiles from Supabase
    const { data: existing } = await supabase
      .from('crew_profiles')
      .select('name')
      .eq('user_id', userId)
    
    const existingNames = new Set(existing?.map((p: any) => p.name) || [])
    console.log(`[MigrateCrewFromLogEntries] Found ${existingNames.size} existing crew profiles in Supabase`)
    
    // Filter out names that already exist
    const namesToMigrate = Array.from(crewNames).filter(name => !existingNames.has(name))
    console.log(`[MigrateCrewFromLogEntries] Need to migrate ${namesToMigrate.length} new crew profiles`)
    
    if (namesToMigrate.length === 0) {
      return { success: true, migrated: 0 }
    }
    
    // Create profiles for each crew name
    const profiles = namesToMigrate.map(name => ({
      user_id: userId,
      name: name,
      certificate_number: null,
      certificate_type: null,
      notes: null
    }))
    
    // Insert profiles one by one to see which ones fail
    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    
    for (const profile of profiles) {
      const { error } = await supabase
        .from('crew_profiles')
        .upsert(profile, { onConflict: 'user_id,name' })
      
      if (error) {
        console.error(`[MigrateCrewFromLogEntries] Failed to migrate "${profile.name}":`, error)
        errors.push(`${profile.name}: ${error.message}`)
        failCount++
      } else {
        successCount++
      }
    }
    
    console.log(`[MigrateCrewFromLogEntries] Migration complete: ${successCount} succeeded, ${failCount} failed`)
    if (errors.length > 0) {
      console.error('[MigrateCrewFromLogEntries] Errors:', errors)
    }
    
    if (failCount > 0) {
      return { success: false, migrated: successCount, error: `${failCount} profiles failed to migrate. Check console for details.` }
    }
    
    return { success: true, migrated: successCount }
  } catch (error) {
    console.error('Error migrating crew from log entries:', error)
    return { success: false, migrated: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Re-migrate crew profiles - useful if some were missed
 * This will upsert all crew profiles from localStorage to Supabase
 */
export const remigrateCrewProfiles = async (userId: string): Promise<{ success: boolean; migrated: number; error?: string }> => {
  if (typeof window === 'undefined') {
    return { success: false, migrated: 0, error: 'Not in browser environment' }
  }
  
  try {
    const stored = window.localStorage.getItem(CREW_PROFILES_STORAGE_KEY)
    if (!stored) {
      return { success: false, migrated: 0, error: 'No crew profiles in localStorage' }
    }
    
    const crewProfiles: Record<string, CrewProfile> = JSON.parse(stored)
    if (!crewProfiles || typeof crewProfiles !== 'object') {
      return { success: false, migrated: 0, error: 'Invalid crew profiles data' }
    }
    
    const profileEntries = Object.entries(crewProfiles)
    console.log(`[ReMigrateCrewProfiles] Found ${profileEntries.length} crew profiles in localStorage`)
    
    // Get existing crew profiles from Supabase to see what's already there
    const { data: existing } = await supabase
      .from('crew_profiles')
      .select('name')
      .eq('user_id', userId)
    
    const existingNames = new Set(existing?.map((p: any) => p.name) || [])
    console.log(`[ReMigrateCrewProfiles] Found ${existingNames.size} existing crew profiles in Supabase`)
    
    // Convert to Supabase format - preserve the key as a unique identifier
    // Use the key (which is unique) combined with name to ensure we don't lose entries
    const profiles = profileEntries.map(([key, profile]) => {
      // Use the profile.name if it exists and is different from key, otherwise use key
      // This ensures we preserve all entries even if names are similar
      const profileName = profile.name || key
      return {
        user_id: userId,
        name: profileName.trim(), // Trim whitespace
        certificate_number: profile.certificateNumber || null,
        certificate_type: profile.certificateType || null,
        notes: profile.notes || null,
        // Store the original key in notes if name differs, for debugging
        _originalKey: key !== profileName ? key : undefined
      }
    }).filter(p => p.name && p.name.length > 0) // Filter out empty names
    
    console.log(`[ReMigrateCrewProfiles] Prepared ${profiles.length} profiles to migrate`)
    console.log(`[ReMigrateCrewProfiles] Profile names:`, profiles.map(p => p.name))
    
    // Check for duplicates
    const nameCounts = new Map<string, number>()
    profiles.forEach(p => {
      const normalizedName = p.name.toLowerCase().trim()
      nameCounts.set(normalizedName, (nameCounts.get(normalizedName) || 0) + 1)
    })
    const duplicates = Array.from(nameCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      console.warn(`[ReMigrateCrewProfiles] Warning: Found ${duplicates.length} duplicate names (case-insensitive):`, duplicates.map(([name]) => name))
      // Show which profiles have duplicate names
      duplicates.forEach(([normalizedName]) => {
        const matching = profiles.filter(p => p.name.toLowerCase().trim() === normalizedName)
        console.warn(`  - "${normalizedName}": ${matching.length} entries`, matching.map(p => ({ name: p.name, key: p._originalKey })))
      })
    }
    
    // Remove the debug field before inserting
    const profilesToInsert = profiles.map(({ _originalKey, ...rest }) => rest)
    
    // Insert profiles one by one to see which ones fail
    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    
    for (const profile of profilesToInsert) {
      const { error } = await supabase
        .from('crew_profiles')
        .upsert(profile, { onConflict: 'user_id,name' })
      
      if (error) {
        console.error(`[ReMigrateCrewProfiles] Failed to migrate "${profile.name}":`, error)
        errors.push(`${profile.name}: ${error.message}`)
        failCount++
      } else {
        successCount++
      }
    }
    
    console.log(`[ReMigrateCrewProfiles] Migration complete: ${successCount} succeeded, ${failCount} failed`)
    if (errors.length > 0) {
      console.error('[ReMigrateCrewProfiles] Errors:', errors)
    }
    
    // Get final count
    const { data: final, error: countError } = await supabase
      .from('crew_profiles')
      .select('name', { count: 'exact' })
      .eq('user_id', userId)
    
    if (countError) {
      console.error('Error counting crew profiles:', countError)
    } else {
      console.log(`[ReMigrateCrewProfiles] Final count in Supabase: ${final?.length || 0}`)
    }
    
    if (failCount > 0) {
      return { success: false, migrated: successCount, error: `${failCount} profiles failed to migrate. Check console for details.` }
    }
    
    return { success: true, migrated: successCount }
  } catch (error) {
    console.error('Error re-migrating crew profiles:', error)
    return { success: false, migrated: 0, error: error instanceof Error ? error.message : 'Unknown error' }
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
    
    const profiles = Object.entries(crewProfiles).map(([key, profile]) => ({
      user_id: userId,
      name: profile.name || key, // Use profile.name if available, otherwise use the key
      certificate_number: profile.certificateNumber || null,
      certificate_type: profile.certificateType || null,
      notes: profile.notes || null
    }))
    
    if (profiles.length === 0) return 0
    
    console.log(`[MigrateCrewProfiles] Found ${Object.keys(crewProfiles).length} crew profiles in localStorage`)
    console.log(`[MigrateCrewProfiles] Preparing to migrate ${profiles.length} profiles`)
    
    // Check for duplicate names (which would cause upsert to only keep one)
    const nameCounts = new Map<string, number>()
    profiles.forEach(p => {
      nameCounts.set(p.name, (nameCounts.get(p.name) || 0) + 1)
    })
    const duplicates = Array.from(nameCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      console.warn(`[MigrateCrewProfiles] Warning: Found ${duplicates.length} duplicate names that will be merged:`, duplicates.map(([name]) => name))
    }
    
    // Insert crew profiles (handle duplicates gracefully)
    const { error } = await supabase
      .from('crew_profiles')
      .upsert(profiles, { onConflict: 'user_id,name' })
    
    if (error) {
      console.error('Error migrating crew profiles:', error)
      return 0
    }
    
    console.log(`[MigrateCrewProfiles] Successfully migrated ${profiles.length} crew profiles`)
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

