-- Combine revision and hash triggers into single function
-- This guarantees correct execution order: revision snapshot → increment version → compute hash
-- Eliminates dependency on PostgreSQL trigger ordering behavior

-- Combined trigger function: Handles revision snapshot, version increment, and hash computation
CREATE OR REPLACE FUNCTION update_entry_with_revision_and_hash()
RETURNS TRIGGER AS $$
DECLARE
  hash_text TEXT;
  computed_hash TEXT;
BEGIN
  -- On UPDATE: Create revision snapshot BEFORE modifying anything
  IF TG_OP = 'UPDATE' THEN
    -- Create revision snapshot of old version
    INSERT INTO entry_revisions (entry_id, version, entry_data, data_hash, created_by, reason)
    VALUES (
      OLD.id,
      OLD.version,
      to_jsonb(OLD),
      OLD.data_hash,
      OLD.user_id,
      'Automatic revision before update'
    )
    ON CONFLICT (entry_id, version) DO NOTHING;
    
    -- Increment version
    NEW.version := OLD.version + 1;
  END IF;
  
  -- On INSERT: Set initial version if not already set
  IF TG_OP = 'INSERT' AND NEW.version IS NULL THEN
    NEW.version := 1;
  END IF;
  
  -- Compute hash using NEW data (which includes the incremented version for updates)
  -- Use the same consolidated functions as validation
  hash_text := build_entry_hash_text(
    NEW.date,
    NEW.aircraft_make_model,
    NEW.registration,
    NEW.flight_time,
    NEW.performance,
    NEW.version
  );
  
  -- Compute hash from the normalized text
  computed_hash := compute_entry_hash_from_text(hash_text);
  
  -- Store the computed hash in the row
  NEW.data_hash := computed_hash;
  
  -- Log what we hashed (for debugging) - only if trigger_hash_log table exists
  BEGIN
    INSERT INTO trigger_hash_log (entry_id, hash_text, computed_hash, version)
    VALUES (NEW.id, hash_text, computed_hash, NEW.version)
    ON CONFLICT DO NOTHING; -- Ignore if insert fails (e.g., table doesn't exist or duplicate)
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore logging errors - don't fail the trigger
    NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers (both old names and new names)
DROP TRIGGER IF EXISTS compute_entry_hash_trigger ON log_entries;
DROP TRIGGER IF EXISTS create_revision_trigger ON log_entries;
DROP TRIGGER IF EXISTS a_revision_trigger ON log_entries;
DROP TRIGGER IF EXISTS b_compute_entry_hash_trigger ON log_entries;
DROP TRIGGER IF EXISTS entry_update_trigger ON log_entries;  -- Drop in case it already exists

-- Create single combined trigger
CREATE TRIGGER entry_update_trigger
  BEFORE INSERT OR UPDATE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_with_revision_and_hash();

-- Verify trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'entry_update_trigger'
    AND tgrelid = 'log_entries'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger entry_update_trigger does not exist!';
  END IF;
  
  RAISE NOTICE 'Combined trigger created successfully. All operations (revision, version increment, hash computation) are now in correct order.';
END $$;

