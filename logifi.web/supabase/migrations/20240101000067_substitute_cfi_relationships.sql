-- Temporary substitute CFI: relationship_kind + optional expires_at; signing requires non-expired ACTIVE link.

ALTER TABLE instructor_student_relationships
  ADD COLUMN IF NOT EXISTS relationship_kind TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instructor_student_relationships_kind_check'
  ) THEN
    ALTER TABLE instructor_student_relationships
      ADD CONSTRAINT instructor_student_relationships_kind_check
      CHECK (relationship_kind IN ('primary', 'substitute'));
  END IF;
END $$;

COMMENT ON COLUMN instructor_student_relationships.relationship_kind IS
  'primary = ongoing instructor; substitute = temporary sub CFI (may have expires_at)';

COMMENT ON COLUMN instructor_student_relationships.expires_at IS
  'When set, link cannot be used for signing after this time (typically substitutes)';

CREATE OR REPLACE FUNCTION instructor_relationship_is_signable(
  p_status TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p_status = 'ACTIVE'
    AND (p_expires_at IS NULL OR p_expires_at > NOW());
$$;

COMMENT ON FUNCTION instructor_relationship_is_signable(TEXT, TIMESTAMPTZ) IS
  'True when roster link is ACTIVE and not past expires_at';

-- ============================================================================
-- request_instructor_link: kind + optional expiry
-- ============================================================================

DROP FUNCTION IF EXISTS request_instructor_link(TEXT);

CREATE OR REPLACE FUNCTION request_instructor_link(
  p_instructor_email TEXT,
  p_relationship_kind TEXT DEFAULT 'primary',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_instructor_id UUID;
  v_instructor_role TEXT;
  v_relationship_id UUID;
  v_email TEXT;
  v_kind TEXT := lower(trim(COALESCE(p_relationship_kind, 'primary')));
  v_expires TIMESTAMPTZ := p_expires_at;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_kind NOT IN ('primary', 'substitute') THEN
    RAISE EXCEPTION 'relationship kind must be primary or substitute';
  END IF;

  IF v_kind = 'primary' THEN
    v_expires := NULL;
  ELSIF v_expires IS NOT NULL AND v_expires <= NOW() THEN
    RAISE EXCEPTION 'substitute expiry must be in the future';
  END IF;

  v_email := lower(trim(COALESCE(p_instructor_email, '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'instructor email is required';
  END IF;

  SELECT u.id INTO v_instructor_id
  FROM auth.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'instructor not found';
  END IF;

  IF v_instructor_id = v_student_id THEN
    RAISE EXCEPTION 'cannot link to yourself';
  END IF;

  SELECT up.role INTO v_instructor_role
  FROM user_profiles up
  WHERE up.id = v_instructor_id;

  IF v_instructor_role IS NULL THEN
    RAISE EXCEPTION 'instructor profile not found';
  END IF;

  IF v_instructor_role NOT IN ('INSTRUCTOR', 'DUAL') THEN
    RAISE EXCEPTION 'target user is not an instructor';
  END IF;

  INSERT INTO instructor_student_relationships (
    student_id,
    instructor_id,
    status,
    relationship_kind,
    expires_at
  )
  VALUES (
    v_student_id,
    v_instructor_id,
    'PENDING',
    v_kind,
    v_expires
  )
  ON CONFLICT (student_id, instructor_id) DO UPDATE
    SET
      status = CASE
        WHEN instructor_student_relationships.status = 'REVOKED' THEN 'PENDING'
        ELSE instructor_student_relationships.status
      END,
      relationship_kind = EXCLUDED.relationship_kind,
      expires_at = EXCLUDED.expires_at
  RETURNING id INTO v_relationship_id;

  RETURN v_relationship_id;
END;
$$;

REVOKE ALL ON FUNCTION request_instructor_link(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_instructor_link(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION request_instructor_link(TEXT, TEXT, TIMESTAMPTZ) IS
  'Student requests a PENDING link (primary or substitute) to an instructor by email';

-- ============================================================================
-- sign_log_entry: require non-expired ACTIVE link
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
      AND instructor_relationship_is_signable(r.status, r.expires_at)
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
  'Verifies instructor PIN and non-expired ACTIVE roster link, clears pending flags, inserts flight_signatures';

-- ============================================================================
-- Pending inbox / review: same expiry rule
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
  updated_at TIMESTAMPTZ,
  amends_entry_id UUID
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
    le.updated_at,
    le.amends_entry_id
  FROM log_entries le
  INNER JOIN instructor_student_relationships r
    ON r.student_id = le.user_id
   AND r.instructor_id = v_caller
   AND instructor_relationship_is_signable(r.status, r.expires_at)
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

CREATE OR REPLACE FUNCTION get_pending_signature_entry(p_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_entry log_entries%ROWTYPE;
  v_student_name TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'entry id is required';
  END IF;

  SELECT * INTO v_entry
  FROM log_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'log entry not found';
  END IF;

  IF v_entry.signature_pending IS NOT TRUE THEN
    RAISE EXCEPTION 'entry is not pending signature';
  END IF;

  IF v_entry.pending_instructor_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'not authorized to review this entry';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM instructor_student_relationships r
    WHERE r.student_id = v_entry.user_id
      AND r.instructor_id = v_caller
      AND instructor_relationship_is_signable(r.status, r.expires_at)
  ) THEN
    RAISE EXCEPTION 'no active instructor relationship for this entry';
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = p_entry_id
  ) THEN
    RAISE EXCEPTION 'entry is already signed';
  END IF;

  SELECT up.full_name INTO v_student_name
  FROM user_profiles up
  WHERE up.id = v_entry.user_id;

  RETURN jsonb_build_object(
    'student_name', v_student_name,
    'entry', to_jsonb(v_entry)
  );
END;
$$;

DROP POLICY IF EXISTS "Owners signers and active instructors can view signatures" ON flight_signatures;
CREATE POLICY "Owners signers and active instructors can view signatures"
  ON flight_signatures FOR SELECT
  USING (
    signer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM log_entries le
      WHERE le.id = flight_signatures.log_entry_id
        AND le.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM log_entries le
      JOIN instructor_student_relationships r
        ON r.student_id = le.user_id
       AND r.instructor_id = auth.uid()
       AND instructor_relationship_is_signable(r.status, r.expires_at)
      WHERE le.id = flight_signatures.log_entry_id
    )
  );

DROP POLICY IF EXISTS "Instructors can insert signatures for linked students" ON flight_signatures;
CREATE POLICY "Instructors can insert signatures for linked students"
  ON flight_signatures FOR INSERT
  WITH CHECK (
    signer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM log_entries le
      JOIN instructor_student_relationships r
        ON r.student_id = le.user_id
       AND r.instructor_id = auth.uid()
       AND instructor_relationship_is_signable(r.status, r.expires_at)
      WHERE le.id = log_entry_id
    )
  );
