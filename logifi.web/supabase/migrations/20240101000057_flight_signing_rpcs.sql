-- Flight signing RPCs: set instructor PIN and sign a student log entry (co-located flow).

-- ============================================================================
-- set_signing_pin
-- ============================================================================

CREATE OR REPLACE FUNCTION set_signing_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_pin TEXT := trim(COALESCE(p_pin, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT up.role INTO v_role
  FROM user_profiles up
  WHERE up.id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF v_role NOT IN ('INSTRUCTOR', 'DUAL') THEN
    RAISE EXCEPTION 'only instructors can set a signing PIN';
  END IF;

  IF char_length(v_pin) < 4 OR char_length(v_pin) > 12 THEN
    RAISE EXCEPTION 'PIN must be between 4 and 12 characters';
  END IF;

  UPDATE user_profiles
  SET
    signing_pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
    updated_at = NOW()
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION set_signing_pin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_signing_pin(TEXT) TO authenticated;

COMMENT ON FUNCTION set_signing_pin(TEXT) IS
  'Stores a bcrypt hash of the instructor signing PIN on user_profiles';

-- ============================================================================
-- sign_log_entry
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

REVOKE ALL ON FUNCTION sign_log_entry(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sign_log_entry(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION sign_log_entry(UUID, UUID, TEXT) IS
  'Verifies instructor PIN and ACTIVE roster link, then inserts an append-only flight_signatures row';
