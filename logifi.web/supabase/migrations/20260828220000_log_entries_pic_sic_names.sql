-- PIC / Captain and SIC / First Officer names on log entries.
-- Names only — not flightTime.pic / flightTime.sic / role.

ALTER TABLE public.log_entries
  ADD COLUMN IF NOT EXISTS pic_name TEXT,
  ADD COLUMN IF NOT EXISTS sic_name TEXT;

COMMENT ON COLUMN public.log_entries.pic_name IS
  'PIC / Captain name. Not PIC time.';
COMMENT ON COLUMN public.log_entries.sic_name IS
  'SIC / First Officer name. Not SIC time.';

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
    pic_name = v_entry_data->>'pic_name',
    sic_name = v_entry_data->>'sic_name',
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
