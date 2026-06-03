-- Addresses Supabase Security Advisor findings not fixed by migration 26:
-- 1. search_path on protect_user_profile_credits (added in 47 without it)
-- 2. search_path on is_logifi_white_glove_admin (dashboard-only function, if present)
-- 3. REVOKE EXECUTE on trigger/helper SECURITY DEFINER functions (26 sets search_path only)
-- 4. validate_entry_integrity: ownership via RLS (see 51 for SECURITY INVOKER)

-- ============================================================================
-- search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_profile_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.credits IS DISTINCT FROM NEW.credits THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.credits := OLD.credits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- White-glove admin helper may exist only in remote DB (not in repo migrations)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_logifi_white_glove_admin'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.is_logifi_white_glove_admin(%s) SET search_path = public, pg_catalog, pg_temp',
      r.args
    );
  END LOOP;
END $$;

-- ============================================================================
-- validate_entry_integrity: restrict RPC to owning user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_entry_integrity(entry_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  computed_hash TEXT
) AS $$
DECLARE
  entry_record public.log_entries%ROWTYPE;
  hash_text TEXT;
  computed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO entry_record
  FROM public.log_entries
  WHERE id = entry_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  hash_text := public.build_entry_hash_text(
    entry_record.date,
    entry_record.aircraft_make_model,
    entry_record.registration,
    entry_record.flight_time,
    entry_record.performance,
    entry_record.version
  );

  computed := public.compute_entry_hash_from_text(hash_text);

  RETURN QUERY
  SELECT
    (entry_record.data_hash = computed) AS is_valid,
    entry_record.data_hash AS current_hash,
    computed AS computed_hash;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) TO authenticated;

-- ============================================================================
-- Trigger-only / unused RPC: block API execution (triggers unaffected)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'log_entry_changes',
        'create_revision_before_update',
        'handle_new_user',
        'get_entry_audit_trail'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      r.proname,
      r.args
    );
  END LOOP;
END $$;

-- Orphan after migration 23 (may already be absent)
DROP FUNCTION IF EXISTS public.create_revision_before_update();
