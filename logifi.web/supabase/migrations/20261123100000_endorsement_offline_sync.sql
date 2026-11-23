-- Offline-first endorsements: client-generated ids and device signing timestamp.

DROP FUNCTION IF EXISTS request_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS issue_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS sign_endorsement(UUID, TEXT);
DROP FUNCTION IF EXISTS record_imported_endorsement(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, TIMESTAMPTZ);

-- request_endorsement (+ optional client id)
CREATE OR REPLACE FUNCTION request_endorsement(
  p_instructor_id UUID,
  p_template_code TEXT,
  p_title TEXT,
  p_regulation_refs TEXT,
  p_body_template TEXT,
  p_field_values JSONB,
  p_rendered_body TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_id UUID;
  v_existing endorsements%ROWTYPE;
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

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM endorsements WHERE id = p_id;
    IF FOUND THEN
      IF v_existing.student_id <> v_caller OR v_existing.instructor_id <> p_instructor_id THEN
        RAISE EXCEPTION 'endorsement id conflict';
      END IF;
      RETURN p_id;
    END IF;
    v_id := p_id;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO endorsements (
    id,
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
    v_id,
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
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION request_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, UUID) TO authenticated;

-- issue_endorsement (+ optional client id)
CREATE OR REPLACE FUNCTION issue_endorsement(
  p_student_id UUID,
  p_template_code TEXT,
  p_title TEXT,
  p_regulation_refs TEXT,
  p_body_template TEXT,
  p_field_values JSONB,
  p_rendered_body TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_id UUID DEFAULT NULL
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
  v_existing endorsements%ROWTYPE;
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

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM endorsements WHERE id = p_id;
    IF FOUND THEN
      IF v_existing.instructor_id <> v_caller OR v_existing.student_id <> p_student_id THEN
        RAISE EXCEPTION 'endorsement id conflict';
      END IF;
      RETURN p_id;
    END IF;
    v_id := p_id;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO endorsements (
    id,
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
    v_id,
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
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION issue_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION issue_endorsement(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, UUID) TO authenticated;

-- record_imported_endorsement (+ optional client id)
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
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_id UUID DEFAULT NULL
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
  v_existing endorsements%ROWTYPE;
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

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM endorsements WHERE id = p_id;
    IF FOUND THEN
      IF v_existing.student_id <> v_caller THEN
        RAISE EXCEPTION 'endorsement id conflict';
      END IF;
      RETURN p_id;
    END IF;
    v_id := p_id;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO endorsements (
    id,
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
    v_id,
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
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION record_imported_endorsement(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_imported_endorsement(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, DATE, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

-- sign_endorsement (+ optional device signed_at)
CREATE OR REPLACE FUNCTION sign_endorsement(
  p_endorsement_id UUID,
  p_pin TEXT,
  p_signed_at TIMESTAMPTZ DEFAULT NULL
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
  v_signed_at TIMESTAMPTZ;
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

  IF v_row.status = 'signed' THEN
    RETURN p_endorsement_id;
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

  v_signed_at := COALESCE(p_signed_at, NOW());
  IF v_signed_at < v_row.created_at - interval '1 minute' THEN
    RAISE EXCEPTION 'invalid signed_at';
  END IF;
  IF v_signed_at > NOW() + interval '5 minutes' THEN
    RAISE EXCEPTION 'invalid signed_at';
  END IF;

  v_signature_hash := public.digest_text_hex(
    v_row.rendered_body || ':' || v_caller::text || ':' || extract(epoch from v_signed_at)::text,
    'sha256'
  );

  UPDATE endorsements
  SET
    status = 'signed',
    signed_at = v_signed_at,
    signature_hash = v_signature_hash,
    cfi_number = v_cfi_number,
    cfi_expiration = v_cfi_expiration,
    instructor_full_name = COALESCE(NULLIF(trim(v_full_name), ''), NULL),
    updated_at = NOW()
  WHERE id = p_endorsement_id;

  RETURN p_endorsement_id;
END;
$$;

REVOKE ALL ON FUNCTION sign_endorsement(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sign_endorsement(UUID, TEXT, TIMESTAMPTZ) TO authenticated;