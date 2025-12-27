-- Function to compute data hash for integrity
CREATE OR REPLACE FUNCTION compute_entry_hash(entry_data JSONB)
RETURNS TEXT AS $$
  SELECT encode(digest(entry_data::text, 'sha256'), 'hex');
$$ LANGUAGE SQL IMMUTABLE;

-- Function to update entry hash on insert/update
CREATE OR REPLACE FUNCTION update_entry_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_hash := compute_entry_hash(
    jsonb_build_object(
      'date', NEW.date,
      'aircraft_make_model', NEW.aircraft_make_model,
      'registration', NEW.registration,
      'flight_time', NEW.flight_time,
      'performance', NEW.performance,
      'version', NEW.version
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-compute hash
CREATE TRIGGER compute_entry_hash_trigger
  BEFORE INSERT OR UPDATE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_entry_hash();

-- Function to create revision snapshot before update
CREATE OR REPLACE FUNCTION create_revision_before_update()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create revisions
CREATE TRIGGER create_revision_trigger
  BEFORE UPDATE ON log_entries
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION create_revision_before_update();

-- Function to validate entry integrity
CREATE OR REPLACE FUNCTION validate_entry_integrity(entry_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  computed_hash TEXT
) AS $$
DECLARE
  entry_record log_entries%ROWTYPE;
  computed TEXT;
BEGIN
  SELECT * INTO entry_record FROM log_entries WHERE id = entry_uuid;
  
  computed := compute_entry_hash(
    jsonb_build_object(
      'date', entry_record.date,
      'aircraft_make_model', entry_record.aircraft_make_model,
      'registration', entry_record.registration,
      'flight_time', entry_record.flight_time,
      'performance', entry_record.performance,
      'version', entry_record.version
    )
  );
  
  RETURN QUERY
  SELECT 
    (entry_record.data_hash = computed) as is_valid,
    entry_record.data_hash as current_hash,
    computed as computed_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

