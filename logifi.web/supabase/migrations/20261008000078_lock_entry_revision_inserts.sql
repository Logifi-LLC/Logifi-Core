-- Stop clients from planting log entry revision snapshots.
--
-- entry_revisions was insertable by anon and authenticated. The only check was
-- that the row looked like JSON. update_entry_with_revision_and_hash() inserts
-- with ON CONFLICT (entry_id, version) DO NOTHING, so a pre-planted version
-- makes the owner's real snapshot skip. restore_log_entry_revision is
-- SECURITY DEFINER and would then write that snapshot into the entry.
--
-- No client inserts revisions. History is SELECT; restore is the RPC.
-- This migration does not UPDATE, DELETE, or rewrite any existing row.

-- ============================================================================
-- Trigger inserts the snapshot as the function owner (postgres, BYPASSRLS).
-- Body matches the live function; only the security mode changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_entry_with_revision_and_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  hash_text TEXT;
  computed_hash TEXT;
BEGIN
  -- On UPDATE: Create revision snapshot BEFORE modifying anything
  IF TG_OP = 'UPDATE' THEN
    -- Create revision snapshot of old version
    INSERT INTO entry_revisions (entry_id, version, entry_data, data_hash, created_by, reason)
    VALUES (
      OLD.id,
      OLD.version,
      to_jsonb(OLD),
      OLD.data_hash,
      OLD.user_id,
      'Automatic revision before update'
    )
    ON CONFLICT (entry_id, version) DO NOTHING;

    -- Increment version
    NEW.version := OLD.version + 1;
  END IF;

  -- On INSERT: Set initial version if not already set
  IF TG_OP = 'INSERT' AND NEW.version IS NULL THEN
    NEW.version := 1;
  END IF;

  -- Compute hash using NEW data (which includes the incremented version for updates)
  -- Use the same consolidated functions as validation
  hash_text := build_entry_hash_text(
    NEW.date,
    NEW.aircraft_make_model,
    NEW.registration,
    NEW.flight_time,
    NEW.performance,
    NEW.version
  );

  -- Compute hash from the normalized text
  computed_hash := compute_entry_hash_from_text(hash_text);

  -- Store the computed hash in the row
  NEW.data_hash := computed_hash;

  -- Debug logging removed - no longer needed for production
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_entry_with_revision_and_hash() IS
  'BEFORE INSERT/UPDATE on log_entries. Writes entry_revisions as definer so clients have no INSERT.';

-- Trigger-only. Firing an existing trigger does not need client EXECUTE.
REVOKE ALL ON FUNCTION public.update_entry_with_revision_and_hash() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Clients can no longer insert snapshots. SELECT for history stays.
-- ============================================================================

DROP POLICY IF EXISTS "Allow revision inserts via trigger" ON public.entry_revisions;

REVOKE INSERT ON TABLE public.entry_revisions FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Restore already requires auth.uid() to own the log entry. Also require the
-- revision row's entry to be that same owner, and ignore a snapshot whose
-- user_id is not the caller. Signed entries stay blocked.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_log_entry_revision(
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
  JOIN log_entries le ON le.id = er.entry_id
  WHERE er.entry_id = p_entry_id
    AND er.version = p_version
    AND le.user_id = v_user_id;

  IF v_entry_data IS NULL THEN
    RAISE EXCEPTION 'revision not found';
  END IF;

  IF (v_entry_data->>'user_id') IS DISTINCT FROM v_user_id::text THEN
    RAISE EXCEPTION 'not authorized';
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
  WHERE id = p_entry_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entry not found';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.restore_log_entry_revision(UUID, INTEGER) IS
  'Restores an unsigned log entry to a prior revision owned by auth.uid(). Signed entries stay immutable.';

GRANT EXECUTE ON FUNCTION public.restore_log_entry_revision(UUID, INTEGER) TO authenticated;
