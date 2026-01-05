-- Remove debug features - cleanup for production
-- Removes temporary debug tables, functions, and logging code

-- Remove trigger logging from combined trigger function
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
  
  -- Debug logging removed - no longer needed for production
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop debug table and function
DROP TABLE IF EXISTS trigger_hash_log CASCADE;
DROP FUNCTION IF EXISTS debug_hash_computation(UUID);
DROP FUNCTION IF EXISTS debug_entry_hash(UUID);

