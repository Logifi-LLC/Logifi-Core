-- AC 61-65H endorsements: student request + instructor issue, roster PIN signing.

-- ============================================================================
-- endorsements
-- ============================================================================

CREATE TABLE IF NOT EXISTS endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  regulation_refs TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body_template TEXT NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'signed', 'cancelled')),
  expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_hash TEXT,
  cfi_number TEXT,
  cfi_expiration DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT endorsements_no_self CHECK (student_id <> instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_endorsements_student_status
  ON endorsements(student_id, status);

CREATE INDEX IF NOT EXISTS idx_endorsements_instructor_status
  ON endorsements(instructor_id, status);

CREATE INDEX IF NOT EXISTS idx_endorsements_template_code
  ON endorsements(template_code);

COMMENT ON TABLE endorsements IS
  'AC 61-65H endorsement records: draft/pending until PIN-signed by linked instructor';

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their endorsements"
  ON endorsements FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = instructor_id);

-- Mutations go through SECURITY DEFINER RPCs only.
REVOKE INSERT, UPDATE, DELETE ON endorsements FROM authenticated, anon;

-- ============================================================================
-- Immutability: signed rows cannot change content / identity
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

DROP TRIGGER IF EXISTS trg_protect_signed_endorsement ON endorsements;
CREATE TRIGGER trg_protect_signed_endorsement
  BEFORE UPDATE ON endorsements
  FOR EACH ROW
  EXECUTE FUNCTION protect_signed_endorsement();

CREATE OR REPLACE FUNCTION prevent_delete_signed_endorsement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'signed endorsements cannot be deleted'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_signed_endorsement ON endorsements;
CREATE TRIGGER trg_prevent_delete_signed_endorsement
  BEFORE DELETE ON endorsements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_signed_endorsement();

-- ============================================================================
-- Helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION endorsement_active_relationship(
  p_student_id UUID,
  p_instructor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM instructor_student_relationships r
    WHERE r.student_id = p_student_id
      AND r.instructor_id = p_instructor_id
      AND r.status = 'ACTIVE'
  );
$$;

-- ============================================================================
-- request_endorsement (student → pending)
-- ============================================================================

CREATE OR REPLACE FUNCTION request_endorsement(
  p_instructor_id UUID,
  p_template_code TEXT,
  p_title TEXT,
  p_regulation_refs TEXT,
  p_body_template TEXT,
  p_field_values JSONB,
  p_rendered_body TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_instructor_id IS NULL THEN
    RAISE EXCEPTION 'instructor id is required';
  END IF;
  IF trim(COALESCE(p_template_code, '')) = '' OR trim(COALESCE(p_title, '')) = '' THEN
    RAISE EXCEPTION 'template code and title are required';
  END IF;
  IF trim(COALESCE(p_rendered_body, '')) = '' THEN
    RAISE EXCEPTION 'rendered body is required';
  END IF;
  IF NOT endorsement_active_relationship(v_caller, p_instructor_id) THEN
    RAISE EXCEPTION 'no active instructor relationship';
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
    expires_at
  )
  VALUES (
    v_caller,
    p_instructor_id,
    trim(p_template_code),
    COALESCE(p_regulation_refs, ''),
    trim(p_title),
    COALESCE(p_body_template, ''),
    COALESCE(p_field_values, '{}'::jsonb),
    trim(p_rendered_body),
    'pending',
    p_expires_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION request_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- issue_endorsement (instructor → draft)
-- ============================================================================

CREATE OR REPLACE FUNCTION issue_endorsement(
  p_student_id UUID,
  p_template_code TEXT,
  p_title TEXT,
  p_regulation_refs TEXT,
  p_body_template TEXT,
  p_field_values JSONB,
  p_rendered_body TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT up.role INTO v_role
  FROM user_profiles up
  WHERE up.id = v_caller;

  IF v_role IS NULL OR v_role NOT IN ('INSTRUCTOR', 'DUAL') THEN
    RAISE EXCEPTION 'only instructors can issue endorsements';
  END IF;

  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student id is required';
  END IF;
  IF trim(COALESCE(p_template_code, '')) = '' OR trim(COALESCE(p_title, '')) = '' THEN
    RAISE EXCEPTION 'template code and title are required';
  END IF;
  IF trim(COALESCE(p_rendered_body, '')) = '' THEN
    RAISE EXCEPTION 'rendered body is required';
  END IF;
  IF NOT endorsement_active_relationship(p_student_id, v_caller) THEN
    RAISE EXCEPTION 'no active instructor relationship';
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
    expires_at
  )
  VALUES (
    p_student_id,
    v_caller,
    trim(p_template_code),
    COALESCE(p_regulation_refs, ''),
    trim(p_title),
    COALESCE(p_body_template, ''),
    COALESCE(p_field_values, '{}'::jsonb),
    trim(p_rendered_body),
    'draft',
    p_expires_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION issue_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION issue_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- sign_endorsement
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

  SELECT up.signing_pin_hash, up.cfi_number, up.cfi_expiration
  INTO v_pin_hash, v_cfi_number, v_cfi_expiration
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
    updated_at = NOW()
  WHERE id = p_endorsement_id;

  RETURN p_endorsement_id;
END;
$$;

REVOKE ALL ON FUNCTION sign_endorsement(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sign_endorsement(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION sign_endorsement(UUID, TEXT) IS
  'Verifies instructor PIN and ACTIVE roster link, then locks the endorsement as signed';

-- ============================================================================
-- cancel_endorsement
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

  IF v_caller <> v_row.student_id AND v_caller <> v_row.instructor_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_row.status = 'signed' THEN
    RAISE EXCEPTION 'signed endorsements cannot be cancelled';
  END IF;

  IF v_row.status = 'cancelled' THEN
    RETURN;
  END IF;

  UPDATE endorsements
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_endorsement_id;
END;
$$;

REVOKE ALL ON FUNCTION cancel_endorsement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_endorsement(UUID) TO authenticated;
