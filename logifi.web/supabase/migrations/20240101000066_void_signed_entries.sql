-- Void signed entries via superseding amendment (is_void flag; no hard delete).

ALTER TABLE log_entries
  ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN log_entries.is_void IS
  'True when this row voids a signed original via amends_entry_id (zero-time supersede; no dual-sign gate).';

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

    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      new_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'update',
      old_json,
      new_json,
      changed_fields_array,
      format('Entry updated: %s fields changed', array_length(changed_fields_array, 1)),
      TRUE
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
