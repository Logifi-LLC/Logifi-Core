-- Amendment / supersede audit trail actions (single visible logbook row; history in audit trail).

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN (
    'create', 'update', 'delete', 'sign', 'export', 'restore', 'amend', 'supersede'
  ));

DROP POLICY IF EXISTS "Allow audit log inserts via trigger" ON audit_logs;

CREATE POLICY "Allow audit log inserts via trigger"
  ON audit_logs FOR INSERT
  WITH CHECK (
    entry_id IS NOT NULL
    AND user_id IS NOT NULL
    AND action IS NOT NULL
    AND action IN (
      'create', 'update', 'delete', 'sign', 'export', 'restore', 'amend', 'supersede'
    )
    AND is_compliance_event IS NOT NULL
    AND timestamp IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow audit log updates via trigger" ON audit_logs;

CREATE POLICY "Allow audit log updates via trigger"
  ON audit_logs FOR UPDATE
  USING (
    entry_id IS NOT NULL
    AND user_id IS NOT NULL
    AND action IS NOT NULL
    AND action IN (
      'create', 'update', 'delete', 'sign', 'export', 'restore', 'amend', 'supersede'
    )
  )
  WITH CHECK (
    entry_id IS NOT NULL
    AND user_id IS NOT NULL
    AND action IS NOT NULL
    AND action IN (
      'create', 'update', 'delete', 'sign', 'export', 'restore', 'amend', 'supersede'
    )
    AND is_compliance_event IS NOT NULL
    AND timestamp IS NOT NULL
  );

CREATE OR REPLACE FUNCTION log_entry_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  old_json JSONB;
  new_json JSONB;
  original_json JSONB;
  amend_label TEXT;
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
        format('Amended — corrects signed entry (%s)', amend_label),
        TRUE,
        'Signed entry corrected via amendment'
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
          'amendment_route', coalesce(NEW.departure, '—') || ' → ' || coalesce(NEW.destination, '—')
        ),
        ARRAY[]::TEXT[],
        format('Superseded — replaced by amended entry (%s)', amend_label),
        TRUE,
        'Original signed entry superseded by amendment'
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
