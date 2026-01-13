-- Fix Function Search Path Security Issues
-- This migration adds explicit search_path settings to all functions to prevent
-- search path manipulation attacks. Without an explicit search_path, malicious
-- users could create functions with the same names in their schemas and trick
-- our functions into executing malicious code.
--
-- Security Impact:
-- - SECURITY DEFINER functions are most critical as they run with elevated privileges
-- - All functions need protection to prevent privilege escalation attacks
--
-- Solution: Add SET search_path = public, pg_catalog, pg_temp; to all function definitions
-- This ensures:
-- 1. Built-in PostgreSQL functions (digest, encode, NOW, etc.) are accessible
-- 2. Functions only access objects in the public schema
-- 3. Prevents malicious schema manipulation

-- Ensure pgcrypto extension is enabled (required for digest function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (Critical - run with elevated privileges)
-- ============================================================================

-- Function to get entry audit trail
CREATE OR REPLACE FUNCTION get_entry_audit_trail(entry_uuid UUID)
RETURNS TABLE (
  id UUID,
  action TEXT,
  "timestamp" TIMESTAMPTZ,
  user_id UUID,
  change_summary TEXT,
  changed_fields TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.timestamp,
    al.user_id,
    al.change_summary,
    al.changed_fields
  FROM audit_logs al
  WHERE al.entry_id = entry_uuid
  ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

-- Function to validate entry integrity
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

-- Function to automatically create user profile when new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

-- Function to automatically log changes (audit trail)
CREATE OR REPLACE FUNCTION log_entry_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'DELETE' THEN
    -- For DELETE, we need to insert BEFORE the row is deleted to satisfy FK constraint
    -- But we're using AFTER trigger, so we need to work around this
    -- Store the entry_id before it's deleted
    old_json := to_jsonb(OLD);
    
    -- Insert audit log - entry_id will be valid since we're in the trigger
    -- The FK constraint should pass because the row still exists in the transaction
    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      OLD.id,
      OLD.user_id,
      'delete',
      old_json,
      ARRAY[]::TEXT[],
      'Entry deleted',
      TRUE
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT ARRAY_AGG(key)
    INTO changed_fields_array
    FROM jsonb_each(old_json)
    WHERE value IS DISTINCT FROM new_json->key;
    
    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      new_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'update',
      old_json,
      new_json,
      changed_fields_array,
      format('Entry updated: %s fields changed', array_length(changed_fields_array, 1)),
      TRUE
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      new_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'create',
      new_json,
      ARRAY[]::TEXT[],
      'Entry created',
      TRUE
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

-- ============================================================================
-- REGULAR FUNCTIONS (Important - still need protection)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp;

-- Function to compute data hash for integrity (legacy - kept for compatibility)
-- Note: digest function from pgcrypto extension is in extensions schema
-- Converted to PL/pgSQL to fix type resolution with restricted search_path
-- Use extensions.digest to explicitly reference the pgcrypto function
CREATE OR REPLACE FUNCTION compute_entry_hash(entry_data JSONB)
RETURNS TEXT AS $$
BEGIN
  -- Use literal string 'sha256'::text to avoid type resolution issues with variables
  RETURN encode(extensions.digest(entry_data::text::bytea, 'sha256'::text), 'hex');
END;
$$ LANGUAGE plpgsql 
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

-- Note: If build_entry_hash_object function exists in your database (not in migrations),
-- it should also have search_path set. This function is not in the codebase, so if
-- Supabase flags it, it may be an old function that should be dropped, or a false positive.

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
$$ LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public, pg_catalog, pg_temp;

-- Compute SHA-256 hash from pre-formatted text string
-- This is a simple wrapper around the digest function
-- Note: digest function from pgcrypto extension is in extensions schema
-- Converted to PL/pgSQL to fix type resolution with restricted search_path
-- Use extensions.digest to explicitly reference the pgcrypto function
CREATE OR REPLACE FUNCTION compute_entry_hash_from_text(hash_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use literal string 'sha256'::text to avoid type resolution issues with variables
  RETURN encode(extensions.digest(hash_text::bytea, 'sha256'::text), 'hex');
END;
$$ LANGUAGE plpgsql 
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

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
$$ LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp;

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
$$ LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp;

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
  
  -- Debug logging removed - no longer needed for production
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp;
