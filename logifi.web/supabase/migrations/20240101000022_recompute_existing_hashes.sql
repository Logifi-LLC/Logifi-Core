-- Recompute hashes for all existing entries using the new consolidated logic
-- This fixes entries that were created/updated with older, inconsistent hash computation

-- Function to recompute hash for a single entry
CREATE OR REPLACE FUNCTION recompute_entry_hash(p_entry_id UUID)
RETURNS TEXT AS $$
DECLARE
  entry_record log_entries%ROWTYPE;
  hash_text TEXT;
  computed_hash TEXT;
BEGIN
  -- Fetch the entry
  SELECT * INTO entry_record FROM log_entries WHERE id = p_entry_id;
  
  -- Use the same consolidated logic as the trigger
  hash_text := build_entry_hash_text(
    entry_record.date,
    entry_record.aircraft_make_model,
    entry_record.registration,
    entry_record.flight_time,
    entry_record.performance,
    entry_record.version
  );
  
  -- Compute hash using the consolidated function
  computed_hash := compute_entry_hash_from_text(hash_text);
  
  -- Update the entry's hash
  UPDATE log_entries
  SET data_hash = computed_hash
  WHERE id = p_entry_id;
  
  RETURN computed_hash;
END;
$$ LANGUAGE plpgsql;

-- Recompute hashes for all entries
DO $$
DECLARE
  entry_record RECORD;
  updated_count INTEGER := 0;
  hash_text TEXT;
  computed_hash TEXT;
BEGIN
  RAISE NOTICE 'Starting hash recomputation for all entries...';
  
  -- Loop through all entries and recompute their hashes
  FOR entry_record IN 
    SELECT id, date, aircraft_make_model, registration, flight_time, performance, version, data_hash
    FROM log_entries
    ORDER BY created_at
  LOOP
    -- Build hash text using consolidated function
    hash_text := build_entry_hash_text(
      entry_record.date,
      entry_record.aircraft_make_model,
      entry_record.registration,
      entry_record.flight_time,
      entry_record.performance,
      entry_record.version
    );
    
    -- Compute hash
    computed_hash := compute_entry_hash_from_text(hash_text);
    
    -- Update if hash is different
    IF entry_record.data_hash IS DISTINCT FROM computed_hash THEN
      UPDATE log_entries
      SET data_hash = computed_hash
      WHERE id = entry_record.id;
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Updated hash for entry % (version %): % -> %', 
        entry_record.id, 
        entry_record.version,
        COALESCE(entry_record.data_hash, 'NULL'),
        computed_hash;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Hash recomputation complete. Updated % entries.', updated_count;
END $$;

-- Drop the temporary function (keep it if you want to recompute individual entries later)
-- DROP FUNCTION IF EXISTS recompute_entry_hash(UUID);

