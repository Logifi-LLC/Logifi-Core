-- Security: analytics SECURITY DEFINER RPCs (shared-project leftovers; no Logifi-Core callers).
-- Performance: auth_rls_initplan on digifi_user_vocabulary and logbook_transfer_requests.

SET search_path TO public;

-- ============================================================================
-- Analytics RPCs: service_role only (pg_cron / dashboard SQL runs as postgres)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  analytics_rpcs text[] := ARRAY[
    'capture_analytics_snapshot',
    'get_logifi_analytics',
    'get_logifi_analytics_timeseries'
  ];
BEGIN
  FOR r IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY (analytics_rpcs)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      r.proname,
      r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      r.proname,
      r.args
    );
  END LOOP;
END $$;

-- ============================================================================
-- digifi_user_vocabulary
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own digifi vocabulary" ON public.digifi_user_vocabulary;
CREATE POLICY "Users can view own digifi vocabulary"
  ON public.digifi_user_vocabulary FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own digifi vocabulary" ON public.digifi_user_vocabulary;
CREATE POLICY "Users can insert own digifi vocabulary"
  ON public.digifi_user_vocabulary FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own digifi vocabulary" ON public.digifi_user_vocabulary;
CREATE POLICY "Users can update own digifi vocabulary"
  ON public.digifi_user_vocabulary FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own digifi vocabulary" ON public.digifi_user_vocabulary;
CREATE POLICY "Users can delete own digifi vocabulary"
  ON public.digifi_user_vocabulary FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- logbook_transfer_requests
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own logbook transfer requests"
  ON public.logbook_transfer_requests;
CREATE POLICY "Users can view own logbook transfer requests"
  ON public.logbook_transfer_requests FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own logbook transfer requests"
  ON public.logbook_transfer_requests;
CREATE POLICY "Users can insert own logbook transfer requests"
  ON public.logbook_transfer_requests FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
