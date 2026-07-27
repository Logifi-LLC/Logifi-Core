-- Restore unsigned log entries to a prior revision with action='restore' audit.
-- Signed entries remain immutable (amend/void only).

CREATE OR REPLACE FUNCTION log_entry_changes()
RETURNS TRIGGER AS $$
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
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);

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
      OLD.user_id,
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

CREATE OR REPLACE FUNCTION restore_log_entry_revision(
  p_entry_id UUID,
  p_version INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_entry_data JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_entry_id IS NULL OR p_version IS NULL THEN
    RAISE EXCEPTION 'entry id and version are required';
  END IF;

  SELECT le.user_id INTO v_owner_id
  FROM log_entries le
  WHERE le.id = p_entry_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'entry not found';
  END IF;

  IF v_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = p_entry_id
  ) THEN
    RAISE EXCEPTION 'Signed log entries cannot be restored; use amend or void instead';
  END IF;

  SELECT er.entry_data INTO v_entry_data
  FROM entry_revisions er
  WHERE er.entry_id = p_entry_id
    AND er.version = p_version;

  IF v_entry_data IS NULL THEN
    RAISE EXCEPTION 'revision not found';
  END IF;

  PERFORM set_config('logifi.restoring_revision', '1', true);
  PERFORM set_config('logifi.restore_version', p_version::text, true);

  UPDATE log_entries
  SET
    date = (v_entry_data->>'date')::date,
    role = v_entry_data->>'role',
    aircraft_category_class = v_entry_data->>'aircraft_category_class',
    category_class_time = CASE
      WHEN v_entry_data ? 'category_class_time' AND v_entry_data->>'category_class_time' IS NOT NULL
        THEN (v_entry_data->>'category_class_time')::numeric
      ELSE NULL
    END,
    aircraft_make_model = v_entry_data->>'aircraft_make_model',
    registration = v_entry_data->>'registration',
    flight_number = v_entry_data->>'flight_number',
    departure = v_entry_data->>'departure',
    destination = v_entry_data->>'destination',
    route = v_entry_data->>'route',
    training_elements = v_entry_data->>'training_elements',
    training_instructor = v_entry_data->>'training_instructor',
    instructor_certificate = v_entry_data->>'instructor_certificate',
    flight_conditions = CASE
      WHEN jsonb_typeof(v_entry_data->'flight_conditions') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v_entry_data->'flight_conditions'))
      ELSE ARRAY[]::TEXT[]
    END,
    remarks = v_entry_data->>'remarks',
    flight_time = COALESCE(v_entry_data->'flight_time', '{}'::jsonb),
    performance = COALESCE(v_entry_data->'performance', '{}'::jsonb),
    oooi = v_entry_data->'oooi',
    flagged = COALESCE((v_entry_data->>'flagged')::boolean, false),
    is_imported = COALESCE((v_entry_data->>'is_imported')::boolean, false),
    import_source = v_entry_data->>'import_source',
    import_batch_id = CASE
      WHEN v_entry_data->>'import_batch_id' IS NOT NULL
        THEN (v_entry_data->>'import_batch_id')::uuid
      ELSE NULL
    END,
    original_entry_date = CASE
      WHEN v_entry_data->>'original_entry_date' IS NOT NULL
        THEN (v_entry_data->>'original_entry_date')::date
      ELSE NULL
    END,
    import_metadata = CASE
      WHEN v_entry_data ? 'import_metadata' THEN v_entry_data->'import_metadata'
      ELSE NULL
    END
  WHERE id = p_entry_id;
END;
$$;

COMMENT ON FUNCTION restore_log_entry_revision(UUID, INTEGER) IS
  'Restores an unsigned owned log entry to a prior revision; writes restore audit via session GUC.';

GRANT EXECUTE ON FUNCTION restore_log_entry_revision(UUID, INTEGER) TO authenticated;
