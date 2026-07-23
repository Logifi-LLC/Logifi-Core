-- Paper / imported endorsements: manual record without Logifi PIN signature.

-- ============================================================================
-- Schema: nullable instructor_id, imported status, import flags
-- ============================================================================

ALTER TABLE endorsements
  ALTER COLUMN instructor_id DROP NOT NULL;

ALTER TABLE endorsements
  DROP CONSTRAINT IF EXISTS endorsements_no_self;

ALTER TABLE endorsements
  ADD CONSTRAINT endorsements_no_self
  CHECK (instructor_id IS NULL OR student_id <> instructor_id);

ALTER TABLE endorsements
  DROP CONSTRAINT IF EXISTS endorsements_status_check;

-- Recreate status check with imported (constraint name may vary)
DO $$
BEGIN
  ALTER TABLE endorsements DROP CONSTRAINT IF EXISTS endorsements_status_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE endorsements
  ADD CONSTRAINT endorsements_status_check
  CHECK (status IN ('draft', 'pending', 'signed', 'cancelled', 'imported'));

ALTER TABLE endorsements
  ADD COLUMN IF NOT EXISTS is_imported BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE endorsements
  ADD COLUMN IF NOT EXISTS import_source TEXT;

COMMENT ON COLUMN endorsements.is_imported IS
  'True when recorded from paper/history; not Logifi PIN-signed';
COMMENT ON COLUMN endorsements.import_source IS
  'Import provenance, e.g. paper_manual';

-- ============================================================================
-- Immutability: signed OR imported content is locked
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_signed_endorsement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.status IN ('signed', 'imported') THEN
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
       OR NEW.is_imported IS DISTINCT FROM OLD.is_imported
       OR NEW.import_source IS DISTINCT FROM OLD.import_source
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      -- Allow student cancel of imported → cancelled only
      IF OLD.status = 'imported'
         AND NEW.status = 'cancelled'
         AND NEW.student_id IS NOT DISTINCT FROM OLD.student_id
         AND NEW.instructor_id IS NOT DISTINCT FROM OLD.instructor_id
         AND NEW.template_code IS NOT DISTINCT FROM OLD.template_code
         AND NEW.regulation_refs IS NOT DISTINCT FROM OLD.regulation_refs
         AND NEW.title IS NOT DISTINCT FROM OLD.title
         AND NEW.body_template IS NOT DISTINCT FROM OLD.body_template
         AND NEW.field_values IS NOT DISTINCT FROM OLD.field_values
         AND NEW.rendered_body IS NOT DISTINCT FROM OLD.rendered_body
         AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
         AND NEW.signed_at IS NOT DISTINCT FROM OLD.signed_at
         AND NEW.signature_hash IS NOT DISTINCT FROM OLD.signature_hash
         AND NEW.cfi_number IS NOT DISTINCT FROM OLD.cfi_number
         AND NEW.cfi_expiration IS NOT DISTINCT FROM OLD.cfi_expiration
         AND NEW.instructor_full_name IS NOT DISTINCT FROM OLD.instructor_full_name
         AND NEW.is_imported IS NOT DISTINCT FROM OLD.is_imported
         AND NEW.import_source IS NOT DISTINCT FROM OLD.import_source
         AND NEW.id IS NOT DISTINCT FROM OLD.id
         AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
        NEW.updated_at := NOW();
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'signed or imported endorsements are immutable'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_delete_signed_endorsement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.status IN ('signed', 'imported') THEN
    RAISE EXCEPTION 'signed or imported endorsements cannot be deleted'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- ============================================================================
-- sign_endorsement: reject imported
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

  IF v_row.status = 'imported' OR v_row.is_imported THEN
    RAISE EXCEPTION 'imported paper endorsements cannot be signed electronically';
  END IF;

  IF v_row.instructor_id IS NULL OR v_row.instructor_id <> v_caller THEN
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

-- ============================================================================
-- cancel_endorsement: allow student cancel of imported
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_endorsement(p_endorsement_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_row endorsements%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_row
  FROM endorsements
  WHERE id = p_endorsement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'endorsement not found';
  END IF;

  IF v_caller <> v_row.student_id
     AND (v_row.instructor_id IS NULL OR v_caller <> v_row.instructor_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_row.status = 'signed' THEN
    RAISE EXCEPTION 'signed endorsements cannot be cancelled';
  END IF;

  IF v_row.status = 'imported' AND v_caller <> v_row.student_id THEN
    RAISE EXCEPTION 'only the student can cancel an imported endorsement';
  END IF;

  IF v_row.status = 'cancelled' THEN
    RETURN;
  END IF;

  UPDATE endorsements
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_endorsement_id;
END;
$$;

-- ============================================================================
-- record_imported_endorsement (student)
-- ============================================================================

CREATE OR REPLACE FUNCTION record_imported_endorsement(
  p_template_code TEXT,
  p_title TEXT,
  p_regulation_refs TEXT,
  p_body_template TEXT,
  p_field_values JSONB,
  p_rendered_body TEXT,
  p_instructor_full_name TEXT,
  p_cfi_number TEXT DEFAULT NULL,
  p_cfi_expiration DATE DEFAULT NULL,
  p_paper_signed_at TIMESTAMPTZ DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_id UUID;
  v_name TEXT := trim(COALESCE(p_instructor_full_name, ''));
  v_body TEXT := trim(COALESCE(p_rendered_body, ''));
  v_signed_at TIMESTAMPTZ := COALESCE(p_paper_signed_at, NOW());
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF trim(COALESCE(p_template_code, '')) = '' OR trim(COALESCE(p_title, '')) = '' THEN
    RAISE EXCEPTION 'template code and title are required';
  END IF;
  IF v_body = '' THEN
    RAISE EXCEPTION 'rendered body is required';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'paper instructor name is required';
  END IF;

  INSERT INTO endorsements (
    student_id,
    instructor_id,
    template_code,
    regulation_refs,
    title,
    body_template,
    field_values,
    rendered_body,
    status,
    expires_at,
    signed_at,
    signature_hash,
    cfi_number,
    cfi_expiration,
    instructor_full_name,
    is_imported,
    import_source
  )
  VALUES (
    v_caller,
    NULL,
    trim(p_template_code),
    COALESCE(p_regulation_refs, ''),
    trim(p_title),
    COALESCE(p_body_template, ''),
    COALESCE(p_field_values, '{}'::jsonb),
    v_body,
    'imported',
    p_expires_at,
    v_signed_at,
    NULL,
    NULLIF(trim(COALESCE(p_cfi_number, '')), ''),
    p_cfi_expiration,
    v_name,
    true,
    'paper_manual'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION record_imported_endorsement(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_imported_endorsement(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION record_imported_endorsement(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Student records a paper endorsement; not Logifi PIN-signed; instructor_id null';

-- ============================================================================
-- list_endorsements_for_student_as_instructor: Main sees imported too
-- Must DROP first — return row type changed (added is_imported, import_source).
-- ============================================================================

DROP FUNCTION IF EXISTS list_endorsements_for_student_as_instructor(UUID);

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
  is_imported BOOLEAN,
  import_source TEXT,
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
    e.is_imported,
    e.import_source,
    e.created_at
  FROM endorsements e
  WHERE e.student_id = p_student_id
    AND (
      (v_kind = 'main' AND e.status IN ('signed', 'imported'))
      OR (
        v_kind IS DISTINCT FROM 'main'
        AND e.status = 'signed'
        AND e.instructor_id = v_caller
      )
    )
  ORDER BY e.signed_at DESC NULLS LAST, e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION list_endorsements_for_student_as_instructor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_endorsements_for_student_as_instructor(UUID) TO authenticated;

COMMENT ON FUNCTION list_endorsements_for_student_as_instructor(UUID) IS
  'Main: signed + imported; linked: own signed only';
