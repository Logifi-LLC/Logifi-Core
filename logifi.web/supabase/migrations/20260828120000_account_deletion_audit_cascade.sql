-- Account deletion: audit_logs FK blocks auth.admin.deleteUser.
--
-- Cascade order: auth.users delete → log_entries CASCADE → BEFORE DELETE
-- log_entry_changes inserts audit_logs with OLD.user_id after the auth user
-- is already gone → audit_logs_user_id_fkey fails
-- ("Database error deleting user").
--
-- Fix: skip audit during account purge, and delete the user's log_entries
-- inside purge while the auth user still exists.

CREATE OR REPLACE FUNCTION log_entry_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  changed_fields_array TEXT[];
  old_json JSONB;
  new_json JSONB;
  original_json JSONB;
  amend_label TEXT;
  amend_action_summary TEXT;
  amend_reason TEXT;
  supersede_summary TEXT;
  supersede_reason TEXT;
  is_restore BOOLEAN;
  restore_version TEXT;
  audit_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Account purge deletes entries intentionally; skip audit (row + user go away).
    IF current_setting('logifi.allow_account_purge', true) = 'on' THEN
      RETURN OLD;
    END IF;

    old_json := to_jsonb(OLD);

    -- If auth.users was already removed (cascade race), do not violate FK.
    IF EXISTS (SELECT 1 FROM auth.users au WHERE au.id = OLD.user_id) THEN
      audit_user_id := OLD.user_id;
    ELSE
      audit_user_id := NULL;
    END IF;

    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      OLD.id,
      audit_user_id,
      'delete',
      old_json,
      ARRAY[]::TEXT[],
      'Entry deleted',
      TRUE
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);

    SELECT ARRAY_AGG(key)
    INTO changed_fields_array
    FROM jsonb_each(old_json)
    WHERE value IS DISTINCT FROM new_json->key;

    is_restore := coalesce(current_setting('logifi.restoring_revision', true), '') = '1';
    restore_version := nullif(current_setting('logifi.restore_version', true), '');

    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      new_data,
      changed_fields,
      change_summary,
      is_compliance_event,
      compliance_reason
    ) VALUES (
      NEW.id,
      NEW.user_id,
      CASE WHEN is_restore THEN 'restore' ELSE 'update' END,
      old_json,
      new_json,
      changed_fields_array,
      CASE
        WHEN is_restore THEN
          format(
            'Entry restored to version %s: %s fields changed',
            coalesce(restore_version, '?'),
            coalesce(array_length(changed_fields_array, 1), 0)
          )
        ELSE
          format('Entry updated: %s fields changed', array_length(changed_fields_array, 1))
      END,
      TRUE,
      CASE
        WHEN is_restore THEN 'Entry restored from revision history'
        ELSE NULL
      END
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);

    IF NEW.amends_entry_id IS NOT NULL THEN
      SELECT to_jsonb(o)
      INTO original_json
      FROM log_entries o
      WHERE o.id = NEW.amends_entry_id;

      amend_label := coalesce(
        to_char(NEW.date::date, 'YYYY-MM-DD'),
        'unknown date'
      ) || ' · ' || coalesce(NEW.departure, '—') || ' → ' || coalesce(NEW.destination, '—');

      IF COALESCE(NEW.is_void, FALSE) THEN
        amend_action_summary := format('Voided — withdraws signed entry (%s)', amend_label);
        amend_reason := 'Signed entry voided via superseding amendment';
        supersede_summary := format('Superseded — voided by entry (%s)', amend_label);
        supersede_reason := 'Original signed entry superseded by void amendment';
      ELSE
        amend_action_summary := format('Amended — corrects signed entry (%s)', amend_label);
        amend_reason := 'Signed entry corrected via amendment';
        supersede_summary := format('Superseded — replaced by amended entry (%s)', amend_label);
        supersede_reason := 'Original signed entry superseded by amendment';
      END IF;

      INSERT INTO audit_logs (
        entry_id,
        user_id,
        action,
        new_data,
        changed_fields,
        change_summary,
        is_compliance_event,
        compliance_reason
      ) VALUES (
        NEW.id,
        NEW.user_id,
        'amend',
        new_json || jsonb_build_object('amends_entry_id', NEW.amends_entry_id),
        ARRAY['amends_entry_id']::TEXT[],
        amend_action_summary,
        TRUE,
        amend_reason
      );

      INSERT INTO audit_logs (
        entry_id,
        user_id,
        action,
        old_data,
        new_data,
        changed_fields,
        change_summary,
        is_compliance_event,
        compliance_reason
      ) VALUES (
        NEW.amends_entry_id,
        NEW.user_id,
        'supersede',
        original_json,
        jsonb_build_object(
          'amendment_entry_id', NEW.id,
          'amendment_date', NEW.date,
          'amendment_route', coalesce(NEW.departure, '—') || ' → ' || coalesce(NEW.destination, '—'),
          'is_void', COALESCE(NEW.is_void, FALSE)
        ),
        ARRAY[]::TEXT[],
        supersede_summary,
        TRUE,
        supersede_reason
      );
    ELSE
      INSERT INTO audit_logs (
        entry_id,
        user_id,
        action,
        new_data,
        changed_fields,
        change_summary,
        is_compliance_event
      ) VALUES (
        NEW.id,
        NEW.user_id,
        'create',
        new_json,
        ARRAY[]::TEXT[],
        'Entry created',
        TRUE
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

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

  -- Delete logbook while auth.users still exists (avoids audit_logs_user_id_fkey).
  DELETE FROM log_entries
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
