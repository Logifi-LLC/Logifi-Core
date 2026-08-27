-- Account deletion: signed/imported endorsements and remaining FK guards.
-- App Store Guideline 5.1.1(v).
--
-- purge_user_data_for_account_deletion runs with logifi.allow_account_purge=on
-- in its own transaction, then auth.admin.deleteUser runs in a later request
-- without that GUC. Blocking rows must be removed or anonymized in the purge
-- itself; FK ON DELETE behavior is a safety net for cascade after that.

-- ---------------------------------------------------------------------------
-- Honor account-purge GUC on endorsement immutability (00071 bodies + bypass)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION protect_signed_endorsement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF current_setting('logifi.allow_account_purge', true) = 'on' THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  IF OLD.status IN ('signed', 'imported') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.instructor_id IS DISTINCT FROM OLD.instructor_id
       OR NEW.template_code IS DISTINCT FROM OLD.template_code
       OR NEW.regulation_refs IS DISTINCT FROM OLD.regulation_refs
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body_template IS DISTINCT FROM OLD.body_template
       OR NEW.field_values IS DISTINCT FROM OLD.field_values
       OR NEW.rendered_body IS DISTINCT FROM OLD.rendered_body
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signature_hash IS DISTINCT FROM OLD.signature_hash
       OR NEW.cfi_number IS DISTINCT FROM OLD.cfi_number
       OR NEW.cfi_expiration IS DISTINCT FROM OLD.cfi_expiration
       OR NEW.instructor_full_name IS DISTINCT FROM OLD.instructor_full_name
       OR NEW.is_imported IS DISTINCT FROM OLD.is_imported
       OR NEW.import_source IS DISTINCT FROM OLD.import_source
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      -- Allow student cancel of imported → cancelled only
      IF OLD.status = 'imported'
         AND NEW.status = 'cancelled'
         AND NEW.student_id IS NOT DISTINCT FROM OLD.student_id
         AND NEW.instructor_id IS NOT DISTINCT FROM OLD.instructor_id
         AND NEW.template_code IS NOT DISTINCT FROM OLD.template_code
         AND NEW.regulation_refs IS NOT DISTINCT FROM OLD.regulation_refs
         AND NEW.title IS NOT DISTINCT FROM OLD.title
         AND NEW.body_template IS NOT DISTINCT FROM OLD.body_template
         AND NEW.field_values IS NOT DISTINCT FROM OLD.field_values
         AND NEW.rendered_body IS NOT DISTINCT FROM OLD.rendered_body
         AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
         AND NEW.signed_at IS NOT DISTINCT FROM OLD.signed_at
         AND NEW.signature_hash IS NOT DISTINCT FROM OLD.signature_hash
         AND NEW.cfi_number IS NOT DISTINCT FROM OLD.cfi_number
         AND NEW.cfi_expiration IS NOT DISTINCT FROM OLD.cfi_expiration
         AND NEW.instructor_full_name IS NOT DISTINCT FROM OLD.instructor_full_name
         AND NEW.is_imported IS NOT DISTINCT FROM OLD.is_imported
         AND NEW.import_source IS NOT DISTINCT FROM OLD.import_source
         AND NEW.id IS NOT DISTINCT FROM OLD.id
         AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
        NEW.updated_at := NOW();
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'signed or imported endorsements are immutable'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_delete_signed_endorsement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF current_setting('logifi.allow_account_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF OLD.status IN ('signed', 'imported') THEN
    RAISE EXCEPTION 'signed or imported endorsements cannot be deleted'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- ---------------------------------------------------------------------------
-- FK safety nets (so cascade cannot get stuck after purge)
-- ---------------------------------------------------------------------------

ALTER TABLE endorsements
  ALTER COLUMN instructor_id DROP NOT NULL;

ALTER TABLE endorsements
  DROP CONSTRAINT IF EXISTS endorsements_instructor_id_fkey;

ALTER TABLE endorsements
  ADD CONSTRAINT endorsements_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

ALTER TABLE flight_signatures
  DROP CONSTRAINT IF EXISTS flight_signatures_log_entry_id_fkey;

ALTER TABLE flight_signatures
  ADD CONSTRAINT flight_signatures_log_entry_id_fkey
  FOREIGN KEY (log_entry_id) REFERENCES log_entries(id) ON DELETE CASCADE;

ALTER TABLE log_entries
  DROP CONSTRAINT IF EXISTS log_entries_amends_entry_id_fkey;

ALTER TABLE log_entries
  ADD CONSTRAINT log_entries_amends_entry_id_fkey
  FOREIGN KEY (amends_entry_id) REFERENCES log_entries(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Expand service-role purge so deleteUser is not blocked
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

  -- Self-FK with no ON DELETE would block log_entry cascade.
  UPDATE log_entries
  SET amends_entry_id = NULL
  WHERE user_id = p_user_id;

  -- Student's endorsements (including signed/imported) must go before profile cascade.
  DELETE FROM endorsements
  WHERE student_id = p_user_id;

  -- Keep the student's endorsement; drop this CFI as issuer.
  UPDATE endorsements
  SET instructor_id = NULL
  WHERE instructor_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION purge_user_data_for_account_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_user_data_for_account_deletion(UUID) TO service_role;

COMMENT ON FUNCTION purge_user_data_for_account_deletion(UUID) IS
  'Prepares user-owned / user-referenced data so auth.admin.deleteUser can succeed. Service role only.';
