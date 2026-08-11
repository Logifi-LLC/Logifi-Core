-- Security Advisor: leftover PUBLIC/anon EXECUTE on Logifi SECURITY DEFINER RPCs
-- and missing search_path on instructor_relationship_is_signable.
--
-- Out of scope (other repo / dashboard — do not change here):
--   get_logifi_analytics, get_logifi_analytics_timeseries, capture_analytics_snapshot
--   public.analytics_snapshots (RLS on, no policies)
--   Auth leaked-password protection (Dashboard → Authentication → Attack protection)
--
-- Expected remaining lint after this migration:
--   "Signed-in users can execute SECURITY DEFINER" on client RPCs. Those functions
--   must stay GRANT EXECUTE TO authenticated; they already check auth.uid()/role().

-- ============================================================================
-- search_path on helper (recreated in 00068 without it)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'instructor_relationship_is_signable'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.instructor_relationship_is_signable(%s) SET search_path = public, pg_catalog, pg_temp',
      r.args
    );
  END LOOP;
END $$;

-- ============================================================================
-- Revoke PUBLIC/anon; restore intended EXECUTE grants (covers overloads)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  service_only text[] := ARRAY[
    'purge_user_data_for_account_deletion',
    'guest_sign_log_entry_for_session'
  ];
  helpers text[] := ARRAY[
    'endorsement_active_relationship',
    'instructor_relationship_is_signable'
  ];
  client_rpcs text[] := ARRAY[
    'set_signing_pin',
    'sign_log_entry',
    'guest_sign_log_entry',
    'list_pending_signatures_for_instructor',
    'get_pending_signature_entry',
    'get_roster_member_profile',
    'request_instructor_link',
    'set_main_instructor',
    'request_endorsement',
    'issue_endorsement',
    'sign_endorsement',
    'cancel_endorsement',
    'record_imported_endorsement',
    'list_endorsements_for_student_as_instructor',
    'get_student_logbook_summary_for_instructor',
    'restore_log_entry_revision'
  ];
BEGIN
  FOR r IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY (client_rpcs || service_only || helpers)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.proname,
      r.args
    );

    IF r.proname = ANY (helpers) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated',
        r.proname,
        r.args
      );
    ELSIF r.proname = ANY (service_only) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated',
        r.proname,
        r.args
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
        r.proname,
        r.args
      );
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        r.proname,
        r.args
      );
    END IF;
  END LOOP;
END $$;
