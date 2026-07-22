-- Instructor pending-signatures inbox: target instructor + list RPC for remote sign.
-- Reuses sign_log_entry (instructor may already call it); discovery was the gap.

-- ============================================================================
-- pending_instructor_id on log_entries
-- ============================================================================

ALTER TABLE log_entries
  ADD COLUMN IF NOT EXISTS pending_instructor_id UUID REFERENCES user_profiles(id);

COMMENT ON COLUMN log_entries.pending_instructor_id IS
  'Instructor targeted when student chose Save without Signing; cleared on sign';

CREATE INDEX IF NOT EXISTS idx_log_entries_pending_instructor
  ON log_entries (pending_instructor_id)
  WHERE signature_pending = true AND pending_instructor_id IS NOT NULL;

-- ============================================================================
-- list_pending_signatures_for_instructor
-- ============================================================================

DROP FUNCTION IF EXISTS list_pending_signatures_for_instructor();

CREATE OR REPLACE FUNCTION list_pending_signatures_for_instructor()
RETURNS TABLE (
  log_entry_id UUID,
  student_id UUID,
  student_name TEXT,
  date DATE,
  departure TEXT,
  destination TEXT,
  registration TEXT,
  aircraft_make_model TEXT,
  dual_received NUMERIC,
  total_time NUMERIC,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    le.id AS log_entry_id,
    le.user_id AS student_id,
    up.full_name AS student_name,
    le.date,
    le.departure,
    le.destination,
    le.registration,
    le.aircraft_make_model,
    COALESCE((le.flight_time->>'dual')::NUMERIC, 0) AS dual_received,
    COALESCE((le.flight_time->>'total')::NUMERIC, 0) AS total_time,
    le.updated_at
  FROM log_entries le
  INNER JOIN instructor_student_relationships r
    ON r.student_id = le.user_id
   AND r.instructor_id = v_caller
   AND r.status = 'ACTIVE'
  LEFT JOIN user_profiles up
    ON up.id = le.user_id
  WHERE le.signature_pending = true
    AND le.pending_instructor_id = v_caller
    AND NOT EXISTS (
      SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = le.id
    )
  ORDER BY le.date DESC, le.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION list_pending_signatures_for_instructor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_pending_signatures_for_instructor() TO authenticated;

COMMENT ON FUNCTION list_pending_signatures_for_instructor() IS
  'Returns summary rows of student flights pending this instructor''s signature (ACTIVE roster only)';

-- ============================================================================
-- sign_log_entry: also clear pending_instructor_id
-- ============================================================================

CREATE OR REPLACE FUNCTION sign_log_entry(
  p_entry_id UUID,
  p_instructor_id UUID,
  p_pin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_entry log_entries%ROWTYPE;
  v_pin_hash TEXT;
  v_pin TEXT := trim(COALESCE(p_pin, ''));
  v_flight_data_hash TEXT;
  v_signature_hash TEXT;
  v_signature_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_entry_id IS NULL OR p_instructor_id IS NULL THEN
    RAISE EXCEPTION 'entry id and instructor id are required';
  END IF;

  IF char_length(v_pin) < 4 OR char_length(v_pin) > 12 THEN
    RAISE EXCEPTION 'invalid PIN';
  END IF;

  SELECT * INTO v_entry
  FROM log_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'log entry not found';
  END IF;

  IF v_caller <> v_entry.user_id AND v_caller <> p_instructor_id THEN
    RAISE EXCEPTION 'not authorized to sign this entry';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM instructor_student_relationships r
    WHERE r.student_id = v_entry.user_id
      AND r.instructor_id = p_instructor_id
      AND r.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'no active instructor relationship for this entry';
  END IF;

  SELECT up.signing_pin_hash INTO v_pin_hash
  FROM user_profiles up
  WHERE up.id = p_instructor_id
    AND up.role IN ('INSTRUCTOR', 'DUAL');

  IF v_pin_hash IS NULL THEN
    RAISE EXCEPTION 'instructor has not set a signing PIN';
  END IF;

  IF extensions.crypt(v_pin, v_pin_hash) IS DISTINCT FROM v_pin_hash THEN
    RAISE EXCEPTION 'invalid PIN';
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = p_entry_id
  ) THEN
    RAISE EXCEPTION 'entry is already signed';
  END IF;

  v_flight_data_hash := v_entry.data_hash;
  IF v_flight_data_hash IS NULL OR v_flight_data_hash = '' THEN
    RAISE EXCEPTION 'entry has no data hash; sync and save the entry before signing';
  END IF;

  -- Clear pending before insert: signed rows cannot be updated afterward.
  UPDATE log_entries
  SET
    signature_pending = false,
    pending_instructor_id = NULL
  WHERE id = p_entry_id
    AND (signature_pending = true OR pending_instructor_id IS NOT NULL);

  v_signature_hash := public.digest_text_hex(
    v_flight_data_hash || ':' || p_instructor_id::text || ':' || extract(epoch from now())::text,
    'sha256'
  );

  INSERT INTO flight_signatures (
    log_entry_id,
    signer_id,
    flight_data_hash,
    signature_hash
  )
  VALUES (
    p_entry_id,
    p_instructor_id,
    v_flight_data_hash,
    v_signature_hash
  )
  RETURNING id INTO v_signature_id;

  RETURN v_signature_id;
END;
$$;

COMMENT ON FUNCTION sign_log_entry(UUID, UUID, TEXT) IS
  'Verifies instructor PIN and ACTIVE roster link, clears signature_pending and pending_instructor_id, then inserts flight_signatures';
