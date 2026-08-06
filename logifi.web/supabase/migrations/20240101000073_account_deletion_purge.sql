-- Account deletion support (App Store Guideline 5.1.1(v))
-- Allows service-role purge of immutability-guarded signature data before auth.users delete.

-- ---------------------------------------------------------------------------
-- Allow controlled purge of append-only flight signature / signed entry guards
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_mutation_of_signed_log_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF current_setting('logifi.allow_account_purge', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures
    WHERE log_entry_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Signed log entries cannot be modified or deleted'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_mutation_of_flight_signatures()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF current_setting('logifi.allow_account_purge', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Flight signatures are append-only and cannot be modified or deleted'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

-- Signatures on other users' flights may outlive the signing instructor.
ALTER TABLE flight_signatures
  ALTER COLUMN signer_id DROP NOT NULL;

ALTER TABLE flight_signatures
  DROP CONSTRAINT IF EXISTS flight_signatures_signer_id_fkey;

ALTER TABLE flight_signatures
  ADD CONSTRAINT flight_signatures_signer_id_fkey
  FOREIGN KEY (signer_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- pending_instructor_id had no ON DELETE behavior; clear on profile delete.
ALTER TABLE log_entries
  DROP CONSTRAINT IF EXISTS log_entries_pending_instructor_id_fkey;

ALTER TABLE log_entries
  ADD CONSTRAINT log_entries_pending_instructor_id_fkey
  FOREIGN KEY (pending_instructor_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- entry_revisions.created_by blocked auth.users delete without ON DELETE.
ALTER TABLE entry_revisions
  DROP CONSTRAINT IF EXISTS entry_revisions_created_by_fkey;

ALTER TABLE entry_revisions
  ADD CONSTRAINT entry_revisions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Service-role purge before auth.admin.deleteUser
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION purge_user_data_for_account_deletion(p_user_id UUID)
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
END;
$$;

REVOKE ALL ON FUNCTION purge_user_data_for_account_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_user_data_for_account_deletion(UUID) TO service_role;

COMMENT ON FUNCTION purge_user_data_for_account_deletion(UUID) IS
  'Prepares user-owned / user-referenced data so auth.admin.deleteUser can succeed. Service role only.';
