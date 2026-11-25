-- Stop clients from forging or rewriting audit_logs rows (AC 120-78B audit trail).
--
-- "Allow audit log inserts via trigger" and "Allow audit log updates via trigger"
-- (20240101000062) only checked that columns were non-null and the action was on the
-- whitelist. Neither checked auth.uid(), so any client could insert an audit row
-- against any entry (for example a fake 'sign') and could UPDATE its own audit
-- history.
--
-- Every server-side writer is SECURITY DEFINER and runs as the table owner, which
-- bypasses RLS: log_entry_changes() (log_entries INSERT/UPDATE/DELETE triggers,
-- including restore_log_entry_revision) and purge_user_data_for_account_deletion().
-- The only client write left is the integrity-check record from useDataIntegrity:
-- an 'export' compliance row on an entry the caller owns. The app's own duplicate
-- 'update'/'delete' inserts are removed in the same release.
--
-- This migration does not UPDATE, DELETE, or rewrite any existing row.

DROP POLICY IF EXISTS "Allow audit log inserts via trigger" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow audit log updates via trigger" ON public.audit_logs;

CREATE POLICY "Owners can record integrity checks on own entries"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND action = 'export'
    AND is_compliance_event = true
    AND EXISTS (
      SELECT 1
      FROM public.log_entries le
      WHERE le.id = audit_logs.entry_id
        AND le.user_id = (select auth.uid())
    )
  );

-- No client may change or remove audit history. SELECT stays on the existing
-- "Users can view own audit logs" policy.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
