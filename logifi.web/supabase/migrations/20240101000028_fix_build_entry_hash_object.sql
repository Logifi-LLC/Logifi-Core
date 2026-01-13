-- Fix build_entry_hash_object Function Search Path Warning
-- This function doesn't exist in the codebase migrations and appears to be
-- a legacy function or false positive from Supabase security scanner.
-- This migration drops it if it exists.

-- Drop build_entry_hash_object if it exists
-- This function is not in the codebase and appears to be legacy/unused
-- The codebase uses build_entry_hash_text instead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'build_entry_hash_object'
  ) THEN
    -- Drop all overloads of the function
    DROP FUNCTION IF EXISTS public.build_entry_hash_object CASCADE;
    RAISE NOTICE 'Dropped legacy function build_entry_hash_object';
  ELSE
    RAISE NOTICE 'Function build_entry_hash_object does not exist - likely false positive from security scanner';
  END IF;
END $$;

-- Note: If you need this function, you should add it to the codebase with proper
-- search_path settings. However, based on the codebase, build_entry_hash_text
-- appears to be the correct function to use instead.
