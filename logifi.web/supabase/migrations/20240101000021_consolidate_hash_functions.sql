-- Consolidated Hash Computation Functions
-- This migration ensures trigger and validation use IDENTICAL logic
-- All previous hash computation modifications are consolidated here

-- Build hash text with guaranteed alphabetical key order and normalized JSONB
-- This is the SINGLE source of truth for how hash text is constructed
CREATE OR REPLACE FUNCTION build_entry_hash_text(
  p_date DATE,
  p_aircraft_make_model TEXT,
  p_registration TEXT,
  p_flight_time JSONB,
  p_performance JSONB,
  p_version INTEGER
)
RETURNS TEXT AS $$
DECLARE
  flight_time_text TEXT;
  performance_text TEXT;
  result_text TEXT;
BEGIN
  -- Normalize nested JSONB objects: convert to text and remove spaces
  -- This ensures consistent formatting regardless of how JSONB was stored
  flight_time_text := COALESCE(p_flight_time::text, 'null');
  performance_text := COALESCE(p_performance::text, 'null');
  
  -- Remove ALL spaces from nested JSONB (both after colons and commas)
  -- This ensures deterministic output regardless of JSONB formatting
  flight_time_text := regexp_replace(
    regexp_replace(flight_time_text, ': ', ':', 'g'),
    ', ', ',', 'g'
  );
  performance_text := regexp_replace(
    regexp_replace(performance_text, ': ', ':', 'g'),
    ', ', ',', 'g'
  );
  
  -- Build JSON string manually with GUARANTEED alphabetical key order
  -- Keys in order: aircraft_make_model, date, flight_time, performance, registration, version
  -- Use to_json() to properly escape string values and handle nulls
  result_text := format(
    '{"aircraft_make_model":%s,"date":%s,"flight_time":%s,"performance":%s,"registration":%s,"version":%s}',
    to_json(COALESCE(p_aircraft_make_model, ''))::text,
    to_json(COALESCE(p_date::text, ''))::text,
    flight_time_text,
    performance_text,
    to_json(COALESCE(p_registration, ''))::text,
    to_json(COALESCE(p_version, 0))::text
  );
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Compute SHA-256 hash from pre-formatted text string
-- This is a simple wrapper around the digest function
CREATE OR REPLACE FUNCTION compute_entry_hash_from_text(hash_text TEXT)
RETURNS TEXT AS $$
  SELECT encode(digest(hash_text, 'sha256'), 'hex');
$$ LANGUAGE SQL IMMUTABLE;

-- Trigger function: Updates hash on INSERT or UPDATE
-- This MUST use the exact same functions as validation
CREATE OR REPLACE FUNCTION update_entry_hash()
RETURNS TRIGGER AS $$
DECLARE
  hash_text TEXT;
  computed_hash TEXT;
BEGIN
  -- Build hash text using the consolidated helper function
  -- This ensures alphabetical key order and normalized JSONB
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

-- Validation function: Checks if stored hash matches computed hash
-- This MUST use the EXACT same functions as the trigger
CREATE OR REPLACE FUNCTION validate_entry_integrity(entry_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  computed_hash TEXT
) AS $$
DECLARE
  entry_record log_entries%ROWTYPE;
  hash_text TEXT;
  computed TEXT;
BEGIN
  -- Fetch the entry from the database
  SELECT * INTO entry_record FROM log_entries WHERE id = entry_uuid;
  
  -- Use EXACT same helper function as trigger
  -- This is critical - any difference will cause validation to fail
  hash_text := build_entry_hash_text(
    entry_record.date,
    entry_record.aircraft_make_model,
    entry_record.registration,
    entry_record.flight_time,
    entry_record.performance,
    entry_record.version
  );
  
  -- Use EXACT same hash computation as trigger
  computed := compute_entry_hash_from_text(hash_text);
  
  -- Return validation result
  RETURN QUERY
  SELECT 
    (entry_record.data_hash = computed) as is_valid,
    entry_record.data_hash as current_hash,
    computed as computed_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers fire in correct order
-- Revision trigger MUST fire first (to increment version)
-- Hash trigger MUST fire second (to hash the new version)
-- PostgreSQL triggers fire in ALPHABETICAL ORDER by trigger name
-- We name them so revision comes before hash alphabetically

-- Drop existing triggers
DROP TRIGGER IF EXISTS compute_entry_hash_trigger ON log_entries;
DROP TRIGGER IF EXISTS create_revision_trigger ON log_entries;

-- Create revision trigger FIRST (name starts with 'a' to ensure it fires first alphabetically)
CREATE TRIGGER a_revision_trigger
  BEFORE UPDATE ON log_entries
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION create_revision_before_update();

-- Create hash trigger SECOND (name starts with 'b' to ensure it fires after revision)
CREATE TRIGGER b_compute_entry_hash_trigger
  BEFORE INSERT OR UPDATE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_hash();

-- Verify triggers exist and are in correct order
DO $$
DECLARE
  trigger_order TEXT;
BEGIN
  -- Check that both triggers exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'a_revision_trigger'
    AND tgrelid = 'log_entries'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger a_revision_trigger does not exist!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'b_compute_entry_hash_trigger'
    AND tgrelid = 'log_entries'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger b_compute_entry_hash_trigger does not exist!';
  END IF;
  
  -- Get trigger order to verify
  SELECT string_agg(tgname, ', ' ORDER BY tgname)
  INTO trigger_order
  FROM pg_trigger
  WHERE tgrelid = 'log_entries'::regclass
  AND tgname IN ('a_revision_trigger', 'b_compute_entry_hash_trigger');
  
  RAISE NOTICE 'Triggers verified successfully. Execution order: %', trigger_order;
END $$;

     