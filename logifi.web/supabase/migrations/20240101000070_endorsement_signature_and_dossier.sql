-- Official endorsement signature snapshot + instructor student dossier RPCs.

-- ============================================================================
-- instructor_full_name on endorsements
-- ============================================================================

ALTER TABLE endorsements
  ADD COLUMN IF NOT EXISTS instructor_full_name TEXT;

COMMENT ON COLUMN endorsements.instructor_full_name IS
  'Snapshot of instructor display name at sign time (AC 61-65H signature block)';

-- ============================================================================
-- Protect new column once signed
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_signed_endorsement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.instructor_id IS DISTINCT FROM OLD.instructor_id
       OR NEW.template_code IS DISTINCT FROM OLD.template_code
       OR NEW.regulation_refs IS DISTINCT FROM OLD.regulation_refs
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body_template IS DISTINCT FROM OLD.body_template
       OR NEW.field_values IS DISTINCT FROM OLD.field_values
       OR NEW.rendered_body IS DISTINCT FROM OLD.rendered_body
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signature_hash IS DISTINCT FROM OLD.signature_hash
       OR NEW.cfi_number IS DISTINCT FROM OLD.cfi_number
       OR NEW.cfi_expiration IS DISTINCT FROM OLD.cfi_expiration
       OR NEW.instructor_full_name IS DISTINCT FROM OLD.instructor_full_name
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'signed endorsements are immutable'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- sign_endorsement: also snapshot full_name
-- ============================================================================

CREATE OR REPLACE FUNCTION sign_endorsement(
  p_endorsement_id UUID,
  p_pin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_row endorsements%ROWTYPE;
  v_pin_hash TEXT;
  v_pin TEXT := trim(COALESCE(p_pin, ''));
  v_cfi_number TEXT;
  v_cfi_expiration DATE;
  v_full_name TEXT;
  v_signature_hash TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_endorsement_id IS NULL THEN
    RAISE EXCEPTION 'endorsement id is required';
  END IF;
  IF char_length(v_pin) < 4 OR char_length(v_pin) > 12 THEN
    RAISE EXCEPTION 'invalid PIN';
  END IF;

  SELECT * INTO v_row
  FROM endorsements
  WHERE id = p_endorsement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'endorsement not found';
  END IF;

  IF v_row.instructor_id <> v_caller THEN
    RAISE EXCEPTION 'only the assigned instructor can sign this endorsement';
  END IF;

  IF v_row.status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'endorsement cannot be signed in status %', v_row.status;
  END IF;

  IF trim(COALESCE(v_row.rendered_body, '')) = '' THEN
    RAISE EXCEPTION 'rendered body is required before signing';
  END IF;

  IF NOT endorsement_active_relationship(v_row.student_id, v_caller) THEN
    RAISE EXCEPTION 'no active instructor relationship';
  END IF;

  SELECT up.signing_pin_hash, up.cfi_number, up.cfi_expiration, up.full_name
  INTO v_pin_hash, v_cfi_number, v_cfi_expiration, v_full_name
  FROM user_profiles up
  WHERE up.id = v_caller
    AND up.role IN ('INSTRUCTOR', 'DUAL');

  IF v_pin_hash IS NULL THEN
    RAISE EXCEPTION 'instructor has not set a signing PIN';
  END IF;

  IF extensions.crypt(v_pin, v_pin_hash) IS DISTINCT FROM v_pin_hash THEN
    RAISE EXCEPTION 'invalid PIN';
  END IF;

  v_signature_hash := public.digest_text_hex(
    v_row.rendered_body || ':' || v_caller::text || ':' || extract(epoch from now())::text,
    'sha256'
  );

  UPDATE endorsements
  SET
    status = 'signed',
    signed_at = NOW(),
    signature_hash = v_signature_hash,
    cfi_number = v_cfi_number,
    cfi_expiration = v_cfi_expiration,
    instructor_full_name = COALESCE(NULLIF(trim(v_full_name), ''), NULL),
    updated_at = NOW()
  WHERE id = p_endorsement_id;

  RETURN p_endorsement_id;
END;
$$;

REVOKE ALL ON FUNCTION sign_endorsement(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sign_endorsement(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION sign_endorsement(UUID, TEXT) IS
  'Verifies instructor PIN and ACTIVE roster link, then locks the endorsement as signed with CFI identity snapshot';

-- ============================================================================
-- get_student_logbook_summary_for_instructor (Main only)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_logbook_summary_for_instructor(p_student_id UUID)
RETURNS TABLE (
  entry_count BIGINT,
  total_time NUMERIC,
  dual_received NUMERIC,
  pic NUMERIC,
  last_flight_date DATE
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
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM instructor_student_relationships r
    WHERE r.student_id = p_student_id
      AND r.instructor_id = v_caller
      AND r.status = 'ACTIVE'
      AND r.relationship_kind = 'main'
  ) THEN
    RAISE EXCEPTION 'only the student''s main instructor can view logbook summary';
  END IF;

  RETURN QUERY
  WITH active_entries AS (
    SELECT le.*
    FROM log_entries le
    WHERE le.user_id = p_student_id
      AND NOT EXISTS (
        SELECT 1
        FROM log_entries amd
        WHERE amd.user_id = p_student_id
          AND amd.amends_entry_id = le.id
      )
  )
  SELECT
    COUNT(*)::BIGINT AS entry_count,
    COALESCE(SUM(COALESCE((ae.flight_time->>'total')::NUMERIC, 0)), 0) AS total_time,
    COALESCE(SUM(COALESCE((ae.flight_time->>'dual')::NUMERIC, 0)), 0) AS dual_received,
    COALESCE(SUM(COALESCE((ae.flight_time->>'pic')::NUMERIC, 0)), 0) AS pic,
    MAX(ae.date)::DATE AS last_flight_date
  FROM active_entries ae;
END;
$$;

REVOKE ALL ON FUNCTION get_student_logbook_summary_for_instructor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_student_logbook_summary_for_instructor(UUID) TO authenticated;

COMMENT ON FUNCTION get_student_logbook_summary_for_instructor(UUID) IS
  'Aggregate logbook stats for a student; Main ACTIVE instructor only; excludes superseded entries';

-- ============================================================================
-- list_endorsements_for_student_as_instructor
-- ============================================================================

CREATE OR REPLACE FUNCTION list_endorsements_for_student_as_instructor(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  instructor_id UUID,
  template_code TEXT,
  regulation_refs TEXT,
  title TEXT,
  rendered_body TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_hash TEXT,
  cfi_number TEXT,
  cfi_expiration DATE,
  instructor_full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_kind TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student id is required';
  END IF;

  SELECT r.relationship_kind INTO v_kind
  FROM instructor_student_relationships r
  WHERE r.student_id = p_student_id
    AND r.instructor_id = v_caller
    AND r.status = 'ACTIVE';

  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'no active instructor relationship';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.student_id,
    e.instructor_id,
    e.template_code,
    e.regulation_refs,
    e.title,
    e.rendered_body,
    e.status,
    e.expires_at,
    e.signed_at,
    e.signature_hash,
    e.cfi_number,
    e.cfi_expiration,
    e.instructor_full_name,
    e.created_at
  FROM endorsements e
  WHERE e.student_id = p_student_id
    AND e.status = 'signed'
    AND (
      v_kind = 'main'
      OR e.instructor_id = v_caller
    )
  ORDER BY e.signed_at DESC NULLS LAST, e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION list_endorsements_for_student_as_instructor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_endorsements_for_student_as_instructor(UUID) TO authenticated;

COMMENT ON FUNCTION list_endorsements_for_student_as_instructor(UUID) IS
  'Signed endorsements for a student: Main sees all; linked sees only own';
