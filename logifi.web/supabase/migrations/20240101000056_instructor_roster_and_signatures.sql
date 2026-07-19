-- Instructor/student roster relationships, flight signatures, and signed-entry immutability.
-- Supports FAA AC 120-78B digital logbook signing workflow (Phase 1–2 data layer).

-- ============================================================================
-- user_profiles: role + CFI + signing PIN hash
-- ============================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN IF NOT EXISTS cfi_number TEXT,
  ADD COLUMN IF NOT EXISTS cfi_expiration DATE,
  ADD COLUMN IF NOT EXISTS signing_pin_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_role_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('STUDENT', 'INSTRUCTOR', 'DUAL'));
  END IF;
END $$;

COMMENT ON COLUMN user_profiles.role IS 'Account role: STUDENT, INSTRUCTOR, or DUAL';
COMMENT ON COLUMN user_profiles.cfi_number IS 'CFI certificate number (instructors)';
COMMENT ON COLUMN user_profiles.cfi_expiration IS 'CFI certificate expiration date';
COMMENT ON COLUMN user_profiles.signing_pin_hash IS 'Hash of instructor signing PIN; never expose via roster RPCs';

-- ============================================================================
-- instructor_student_relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT instructor_student_relationships_unique_pair
    UNIQUE (student_id, instructor_id),
  CONSTRAINT instructor_student_relationships_no_self
    CHECK (student_id <> instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_isr_instructor_status
  ON instructor_student_relationships(instructor_id, status);

CREATE INDEX IF NOT EXISTS idx_isr_student_status
  ON instructor_student_relationships(student_id, status);

ALTER TABLE instructor_student_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their relationships"
  ON instructor_student_relationships FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = instructor_id);

-- Inserts go through request_instructor_link (SECURITY DEFINER) so instructor
-- role is validated. No direct INSERT policy for authenticated clients.

CREATE POLICY "Instructors can accept pending links"
  ON instructor_student_relationships FOR UPDATE
  USING (
    auth.uid() = instructor_id
    AND status = 'PENDING'
  )
  WITH CHECK (
    auth.uid() = instructor_id
    AND status = 'ACTIVE'
  );

CREATE POLICY "Participants can revoke relationships"
  ON instructor_student_relationships FOR UPDATE
  USING (
    (auth.uid() = student_id OR auth.uid() = instructor_id)
    AND status IN ('PENDING', 'ACTIVE')
  )
  WITH CHECK (
    (auth.uid() = student_id OR auth.uid() = instructor_id)
    AND status = 'REVOKED'
  );

COMMENT ON TABLE instructor_student_relationships IS
  'Links students to instructors for roster and signing access';

CREATE OR REPLACE FUNCTION protect_instructor_student_relationship_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.student_id IS DISTINCT FROM NEW.student_id
     OR OLD.instructor_id IS DISTINCT FROM NEW.instructor_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
     OR OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'relationship identity columns cannot be changed'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_instructor_student_relationship_keys
  ON instructor_student_relationships;
CREATE TRIGGER trg_protect_instructor_student_relationship_keys
  BEFORE UPDATE ON instructor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION protect_instructor_student_relationship_keys();

-- ============================================================================
-- flight_signatures (append-only; one signature per log entry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS flight_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id UUID NOT NULL UNIQUE REFERENCES log_entries(id),
  signer_id UUID NOT NULL REFERENCES user_profiles(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flight_data_hash TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  drawn_signature_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_flight_signatures_signer
  ON flight_signatures(signer_id);

ALTER TABLE flight_signatures ENABLE ROW LEVEL SECURITY;

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
       AND r.status = 'ACTIVE'
      WHERE le.id = flight_signatures.log_entry_id
    )
  );

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
       AND r.status = 'ACTIVE'
      WHERE le.id = log_entry_id
    )
  );

COMMENT ON TABLE flight_signatures IS
  'Cryptographic signatures for log entries; signed entries are immutable';

-- ============================================================================
-- Immutability triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_mutation_of_signed_log_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM flight_signatures
    WHERE log_entry_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Signed log entries cannot be modified or deleted'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_mutation_of_signed_log_entries ON log_entries;
CREATE TRIGGER trg_prevent_mutation_of_signed_log_entries
  BEFORE UPDATE OR DELETE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_mutation_of_signed_log_entries();

CREATE OR REPLACE FUNCTION prevent_mutation_of_flight_signatures()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Flight signatures are append-only and cannot be modified or deleted'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_mutation_of_flight_signatures ON flight_signatures;
CREATE TRIGGER trg_prevent_mutation_of_flight_signatures
  BEFORE UPDATE OR DELETE ON flight_signatures
  FOR EACH ROW
  EXECUTE FUNCTION prevent_mutation_of_flight_signatures();

-- ============================================================================
-- RPC: request instructor link by email
-- ============================================================================

CREATE OR REPLACE FUNCTION request_instructor_link(p_instructor_email TEXT)
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
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
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

  INSERT INTO instructor_student_relationships (student_id, instructor_id, status)
  VALUES (v_student_id, v_instructor_id, 'PENDING')
  ON CONFLICT (student_id, instructor_id) DO UPDATE
    SET status = CASE
      WHEN instructor_student_relationships.status = 'REVOKED' THEN 'PENDING'
      ELSE instructor_student_relationships.status
    END
  RETURNING id INTO v_relationship_id;

  RETURN v_relationship_id;
END;
$$;

REVOKE ALL ON FUNCTION request_instructor_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_instructor_link(TEXT) TO authenticated;

COMMENT ON FUNCTION request_instructor_link(TEXT) IS
  'Student requests a PENDING link to an instructor looked up by auth email';

-- ============================================================================
-- RPC: safe roster profile (excludes signing_pin_hash)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_roster_member_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  role TEXT,
  cfi_number TEXT,
  cfi_expiration DATE
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

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required';
  END IF;

  IF p_user_id <> v_caller THEN
    IF NOT EXISTS (
      SELECT 1
      FROM instructor_student_relationships r
      WHERE r.status IN ('PENDING', 'ACTIVE')
        AND (
          (r.student_id = v_caller AND r.instructor_id = p_user_id)
          OR (r.instructor_id = v_caller AND r.student_id = p_user_id)
        )
    ) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.full_name,
    up.role,
    up.cfi_number,
    up.cfi_expiration
  FROM user_profiles up
  WHERE up.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION get_roster_member_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_roster_member_profile(UUID) TO authenticated;

COMMENT ON FUNCTION get_roster_member_profile(UUID) IS
  'Returns safe profile fields for self or a non-REVOKED roster relationship partner';
