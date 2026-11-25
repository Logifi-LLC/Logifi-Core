-- Keep an entry's audit trail after the entry is deleted (AC 120-78B).
--
-- audit_logs.entry_id referenced log_entries(id) ON DELETE CASCADE
-- (20240101000002). The BEFORE DELETE trigger log_entry_changes() writes a
-- 'delete' row with the full old row, and the cascade then removed it together
-- with every earlier create/update/sign row for that entry. Deleting a flight left
-- no record that it ever existed.
--
-- entry_id stays NOT NULL and keeps its index; only the foreign key goes, the same
-- shape as log_entry_deletions. entry_revisions keeps its cascade: revision
-- snapshots exist for restore, and keeping them would collide on
-- (entry_id, version) if a deleted entry is restored from a backup with the same id.
-- The delete audit row already holds the full deleted row.
--
-- Users still only SELECT audit rows for entries they own ("Users can view own audit
-- logs" joins log_entries), so rows for deleted entries are retained, not exposed.
-- Account deletion previously relied on the cascade; the purge now deletes the
-- user's audit rows explicitly.
--
-- This migration does not UPDATE or DELETE any existing row.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.audit_logs'::regclass
      AND c.confrelid = 'public.log_entries'::regclass
      AND a.attname = 'entry_id'
  LOOP
    EXECUTE format('ALTER TABLE public.audit_logs DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

COMMENT ON COLUMN public.audit_logs.entry_id IS
  'log_entries.id the row describes. No FK: audit history outlives the entry (AC 120-78B).';

-- ============================================================================
-- Account purge: body matches 20260828120000 plus the audit delete at the end.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purge_user_data_for_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only service_role may purge account data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;

  PERFORM set_config('logifi.allow_account_purge', 'on', true);

  -- Clear outbound references that may block cascade / auth delete.
  UPDATE log_entries
  SET
    signature_pending = false,
    pending_instructor_id = NULL
  WHERE pending_instructor_id = p_user_id;

  UPDATE entry_revisions
  SET created_by = NULL
  WHERE created_by = p_user_id;

  -- Keep student signature rows but anonymize this instructor as signer.
  UPDATE flight_signatures
  SET signer_id = NULL
  WHERE signer_id = p_user_id
    AND log_entry_id NOT IN (SELECT id FROM log_entries WHERE user_id = p_user_id);

  -- Remove signatures on the deleting user's own entries so cascade can proceed.
  DELETE FROM flight_signatures
  WHERE log_entry_id IN (SELECT id FROM log_entries WHERE user_id = p_user_id);

  -- Self-FK with no ON DELETE would block log_entry cascade.
  UPDATE log_entries
  SET amends_entry_id = NULL
  WHERE user_id = p_user_id;

  -- Delete logbook while auth.users still exists (avoids audit_logs_user_id_fkey).
  DELETE FROM log_entries
  WHERE user_id = p_user_id;

  -- audit_logs no longer cascades from log_entries. Remove this user's audit history,
  -- including rows for entries deleted earlier and rows the UPDATEs above just wrote.
  -- user_id is the entry owner on every audit row; old/new_data covers rows written
  -- with a NULL user_id during an auth cascade race.
  DELETE FROM audit_logs
  WHERE user_id = p_user_id
     OR (
       user_id IS NULL
       AND (
         old_data->>'user_id' = p_user_id::text
         OR new_data->>'user_id' = p_user_id::text
       )
     );

  -- Student's endorsements (including signed/imported) must go before profile cascade.
  DELETE FROM endorsements
  WHERE student_id = p_user_id;

  -- Keep the student's endorsement; drop this CFI as issuer.
  UPDATE endorsements
  SET instructor_id = NULL
  WHERE instructor_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_user_data_for_account_deletion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_user_data_for_account_deletion(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_data_for_account_deletion(UUID) TO service_role;

COMMENT ON FUNCTION public.purge_user_data_for_account_deletion(UUID) IS
  'Prepares user-owned / user-referenced data so auth.admin.deleteUser can succeed. Service role only.';
