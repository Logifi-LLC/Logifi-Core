-- Fix digest function error
-- The error "function digest(bytea, text) does not exist" occurs because
-- pgcrypto extension may not be enabled or the function isn't in the search_path
-- This migration ensures pgcrypto is enabled and fixes the function definitions

-- Ensure pgcrypto extension is enabled (required for digest function)
-- This must be done first before any functions that use digest
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Diagnostic: Check extension location and digest function existence
DO $$
DECLARE
  ext_schema TEXT;
  func_exists BOOLEAN;
  func_signature TEXT;
BEGIN
  -- Find which schema pgcrypto is installed in
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname = 'pgcrypto';
  
  IF ext_schema IS NULL THEN
    RAISE EXCEPTION 'pgcrypto extension not found';
  END IF;
  
  RAISE NOTICE 'pgcrypto extension found in schema: %', ext_schema;
  
  -- Check if digest function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = ext_schema
    AND p.proname = 'digest'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE EXCEPTION 'digest function not found in schema %', ext_schema;
  END IF;
  
  -- Get function signature
  SELECT pg_get_function_identity_arguments(p.oid) INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = ext_schema
  AND p.proname = 'digest'
  LIMIT 1;
  
  RAISE NOTICE 'digest function found with signature: %', func_signature;
END $$;

-- Fix compute_entry_hash_from_text function
-- The pgcrypto digest function signature is digest(bytea, text)
-- In PL/pgSQL, we must explicitly cast TEXT to bytea (unlike SQL functions which auto-cast)
-- Use schema-qualified call: extensions.digest() since pgcrypto is installed in extensions schema
CREATE OR REPLACE FUNCTION compute_entry_hash_from_text(hash_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Cast TEXT to bytea explicitly - pgcrypto digest requires bytea, not text
  -- In PL/pgSQL, auto-casting from text to bytea doesn't work like in SQL functions
  -- Schema-qualify digest call to extensions schema where pgcrypto is installed
  RETURN encode(extensions.digest(hash_text::bytea, 'sha256'::text), 'hex');
END;
$$ LANGUAGE plpgsql 
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

-- Fix compute_entry_hash function (legacy function, kept for compatibility)
-- The pgcrypto digest function signature is digest(bytea, text)
-- In PL/pgSQL, we must explicitly cast TEXT to bytea
-- Use schema-qualified call: extensions.digest() since pgcrypto is installed in extensions schema
CREATE OR REPLACE FUNCTION compute_entry_hash(entry_data JSONB)
RETURNS TEXT AS $$
BEGIN
  -- Cast TEXT to bytea explicitly - pgcrypto digest requires bytea, not text
  -- In PL/pgSQL, auto-casting from text to bytea doesn't work like in SQL functions
  -- Schema-qualify digest call to extensions schema where pgcrypto is installed
  RETURN encode(extensions.digest(entry_data::text::bytea, 'sha256'::text), 'hex');
END;
$$ LANGUAGE plpgsql 
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

-- Verify that digest function is accessible and works
-- Test by calling the function we just created instead of digest directly
-- This avoids type resolution issues in the DO block
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Test by calling compute_entry_hash_from_text which uses digest internally
  -- This verifies that digest is accessible within our functions
  test_result := compute_entry_hash_from_text('test');
  
  IF test_result IS NULL OR length(test_result) = 0 THEN
    RAISE EXCEPTION 'digest function returned empty result';
  END IF;
  
  RAISE NOTICE 'digest function is accessible and working (test hash: %)', substring(test_result, 1, 16) || '...';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'digest function is not accessible: %', SQLERRM;
END $$;
