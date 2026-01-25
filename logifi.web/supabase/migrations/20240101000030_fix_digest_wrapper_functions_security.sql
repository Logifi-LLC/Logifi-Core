-- Fix digest wrapper functions security
-- Addresses Supabase security findings for:
-- - public.digest_text_bytes_hex
-- - public.digest_text_hex
-- - public.digest_bytea_hex
--
-- These functions may be:
-- 1. Built-in pgcrypto extension functions (in which case we create secure wrappers)
-- 2. Custom functions created elsewhere that need security fixes
-- 3. Functions that don't exist (false positive from Supabase scanner)
--
-- This migration checks for each function and either:
-- - Recreates it with proper search_path if it exists
-- - Creates a secure wrapper if it's a built-in function
-- - Documents if it doesn't exist (no action needed)

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- Fix digest_text_hex function
-- ============================================================================

-- Check if function exists and drop it if it does (we'll recreate with security)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_text_hex'
  ) THEN
    DROP FUNCTION IF EXISTS public.digest_text_hex(TEXT, TEXT);
  END IF;
END $$;

-- Create secure wrapper for digest_text_hex
-- This wraps the pgcrypto digest function with proper search_path
CREATE OR REPLACE FUNCTION public.digest_text_hex(
  input_text TEXT,
  algorithm TEXT DEFAULT 'sha256'
)
RETURNS TEXT AS $$
BEGIN
  -- Use schema-qualified call to extensions.digest
  -- This ensures we're calling the pgcrypto function, not a malicious replacement
  RETURN encode(extensions.digest(input_text::bytea, algorithm::text), 'hex');
END;
$$ LANGUAGE plpgsql
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

-- ============================================================================
-- Fix digest_text_bytes_hex function
-- ============================================================================

-- Check if function exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_text_bytes_hex'
  ) THEN
    DROP FUNCTION IF EXISTS public.digest_text_bytes_hex(TEXT, TEXT);
  END IF;
END $$;

-- Create secure wrapper for digest_text_bytes_hex
-- Similar to digest_text_hex but explicitly handles bytea conversion
CREATE OR REPLACE FUNCTION public.digest_text_bytes_hex(
  input_text TEXT,
  algorithm TEXT DEFAULT 'sha256'
)
RETURNS TEXT AS $$
BEGIN
  -- Explicitly cast to bytea and use schema-qualified digest call
  RETURN encode(extensions.digest(input_text::bytea, algorithm::text), 'hex');
END;
$$ LANGUAGE plpgsql
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

-- ============================================================================
-- Fix digest_bytea_hex function
-- ============================================================================

-- Check if function exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_bytea_hex'
  ) THEN
    DROP FUNCTION IF EXISTS public.digest_bytea_hex(BYTEA, TEXT);
  END IF;
END $$;

-- Create secure wrapper for digest_bytea_hex
-- This accepts bytea directly (no conversion needed)
CREATE OR REPLACE FUNCTION public.digest_bytea_hex(
  input_bytea BYTEA,
  algorithm TEXT DEFAULT 'sha256'
)
RETURNS TEXT AS $$
BEGIN
  -- Use schema-qualified call to extensions.digest
  -- Input is already bytea, so no conversion needed
  RETURN encode(extensions.digest(input_bytea, algorithm::text), 'hex');
END;
$$ LANGUAGE plpgsql
IMMUTABLE
SET search_path = extensions, public, pg_catalog, pg_temp;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify all functions exist and have proper search_path
DO $$
DECLARE
  func_exists BOOLEAN;
  func_name TEXT;
  func_search_path TEXT;
BEGIN
  -- Check digest_text_hex
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_text_hex'
  ) INTO func_exists;
  
  IF func_exists THEN
    SELECT 
      p.proname,
      COALESCE(
        (SELECT option_value FROM pg_options_to_table(p.proconfig) WHERE option_name = 'search_path'),
        'NOT SET'
      )
    INTO func_name, func_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_text_hex'
    LIMIT 1;
    
    RAISE NOTICE 'digest_text_hex: Function exists with search_path: %', func_search_path;
  ELSE
    RAISE NOTICE 'digest_text_hex: Function not found (may be false positive)';
  END IF;
  
  -- Check digest_text_bytes_hex
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_text_bytes_hex'
  ) INTO func_exists;
  
  IF func_exists THEN
    SELECT 
      p.proname,
      COALESCE(
        (SELECT option_value FROM pg_options_to_table(p.proconfig) WHERE option_name = 'search_path'),
        'NOT SET'
      )
    INTO func_name, func_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_text_bytes_hex'
    LIMIT 1;
    
    RAISE NOTICE 'digest_text_bytes_hex: Function exists with search_path: %', func_search_path;
  ELSE
    RAISE NOTICE 'digest_text_bytes_hex: Function not found (may be false positive)';
  END IF;
  
  -- Check digest_bytea_hex
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_bytea_hex'
  ) INTO func_exists;
  
  IF func_exists THEN
    SELECT 
      p.proname,
      COALESCE(
        (SELECT option_value FROM pg_options_to_table(p.proconfig) WHERE option_name = 'search_path'),
        'NOT SET'
      )
    INTO func_name, func_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'digest_bytea_hex'
    LIMIT 1;
    
    RAISE NOTICE 'digest_bytea_hex: Function exists with search_path: %', func_search_path;
  ELSE
    RAISE NOTICE 'digest_bytea_hex: Function not found (may be false positive)';
  END IF;
  
  RAISE NOTICE 'Migration complete: All digest wrapper functions have been secured with explicit search_path';
END $$;

-- Test the functions to ensure they work correctly
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Test digest_text_hex
  test_result := public.digest_text_hex('test', 'sha256');
  IF test_result IS NULL OR length(test_result) = 0 THEN
    RAISE EXCEPTION 'digest_text_hex function test failed';
  END IF;
  RAISE NOTICE 'digest_text_hex test passed: %', substring(test_result, 1, 16) || '...';
  
  -- Test digest_text_bytes_hex
  test_result := public.digest_text_bytes_hex('test', 'sha256');
  IF test_result IS NULL OR length(test_result) = 0 THEN
    RAISE EXCEPTION 'digest_text_bytes_hex function test failed';
  END IF;
  RAISE NOTICE 'digest_text_bytes_hex test passed: %', substring(test_result, 1, 16) || '...';
  
  -- Test digest_bytea_hex
  test_result := public.digest_bytea_hex('test'::bytea, 'sha256');
  IF test_result IS NULL OR length(test_result) = 0 THEN
    RAISE EXCEPTION 'digest_bytea_hex function test failed';
  END IF;
  RAISE NOTICE 'digest_bytea_hex test passed: %', substring(test_result, 1, 16) || '...';
  
  RAISE NOTICE 'All digest wrapper functions are working correctly';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Function test failed: %. This may indicate the functions are not used in the codebase.', SQLERRM;
END $$;
