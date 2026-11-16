-- Snapshot CFI name / certificate / expiration onto every flight signature (61.51(h), 61.189).
-- Restrict sign_log_entry to the authenticated instructor (auth.uid() = instructor).
-- Guest/QR paths require certificate number and expiration. No backfill (table is empty).
-- Append-only lock-on-sign and amend/void triggers are unchanged.

-- ============================================================================
-- Additive identity columns on flight_signatures
-- ============================================================================

ALTER TABLE flight_signatures
  ADD COLUMN IF NOT EXISTS signer_name TEXT,
  ADD COLUMN IF NOT EXISTS signer_certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS signer_certificate_expiration DATE;

COMMENT ON COLUMN flight_signatures.signer_name IS
  'CFI display name frozen at sign time (profile, guest, or QR)';
COMMENT ON COLUMN flight_signatures.signer_certificate_number IS
  'CFI certificate number frozen at sign time';
COMMENT ON COLUMN flight_signatures.signer_certificate_expiration IS
  'CFI certificate expiration or 61.197 recent-experience end date frozen at sign time';

-- Empty table: require identity on every new row.
ALTER TABLE flight_signatures
  ALTER COLUMN signer_name SET NOT NULL,
  ALTER COLUMN signer_certificate_number SET NOT NULL,
  ALTER COLUMN signer_certificate_expiration SET NOT NULL;

ALTER TABLE flight_signatures
  DROP CONSTRAINT IF EXISTS flight_signatures_signer_identity_check;

ALTER TABLE flight_signatures
  ADD CONSTRAINT flight_signatures_signer_identity_check
  CHECK (
    length(trim(signer_name)) > 0
    AND length(trim(signer_certificate_number)) > 0
    AND signer_certificate_expiration IS NOT NULL
  );

-- ============================================================================
-- Rate-limit log for remote signature-request emails (service_role only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS signature_request_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_request_emails_student_created
  ON signature_request_emails (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signature_request_emails_entry_created
  ON signature_request_emails (log_entry_id, created_at DESC);

ALTER TABLE signature_request_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE signature_request_emails FROM PUBLIC;
REVOKE ALL ON TABLE signature_request_emails FROM anon;
REVOKE ALL ON TABLE signature_request_emails FROM authenticated;
GRANT SELECT, INSERT ON TABLE signature_request_emails TO service_role;

COMMENT ON TABLE signature_request_emails IS
  'Append-only send log for CFI signature-request emails; Nitro/service_role only';

-- ============================================================================
-- sign_log_entry: authenticated CFI only; snapshot identity into hash + row
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
  v_name TEXT;
  v_cert TEXT;
  v_exp DATE;
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

  -- Student PIN-on-device is not allowed. Only the logged-in instructor may sign.
  IF v_caller IS DISTINCT FROM p_instructor_id THEN
    RAISE EXCEPTION 'only the instructor can sign this entry';
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

  IF NOT EXISTS (
    SELECT 1
    FROM instructor_student_relationships r
    WHERE r.student_id = v_entry.user_id
      AND r.instructor_id = p_instructor_id
      AND instructor_relationship_is_signable(r.status, r.expires_at)
  ) THEN
    RAISE EXCEPTION 'no active instructor relationship for this entry';
  END IF;

  SELECT
    up.signing_pin_hash,
    nullif(trim(COALESCE(up.full_name, '')), ''),
    nullif(trim(COALESCE(up.cfi_number, '')), ''),
    up.cfi_expiration
  INTO v_pin_hash, v_name, v_cert, v_exp
  FROM user_profiles up
  WHERE up.id = p_instructor_id
    AND up.role IN ('INSTRUCTOR', 'DUAL');

  IF v_pin_hash IS NULL THEN
    RAISE EXCEPTION 'instructor has not set a signing PIN';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'instructor name is required before signing; add it in Pilot Profile';
  END IF;

  IF v_cert IS NULL THEN
    RAISE EXCEPTION 'instructor certificate number is required before signing; add it in Pilot Profile';
  END IF;

  IF v_exp IS NULL THEN
    RAISE EXCEPTION 'instructor certificate expiration is required before signing; add it in Pilot Profile';
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
    v_flight_data_hash || ':' || p_instructor_id::text || ':' || v_name || ':' ||
      v_cert || ':' || v_exp::text || ':' || extract(epoch from now())::text,
    'sha256'
  );

  INSERT INTO flight_signatures (
    log_entry_id,
    signer_id,
    flight_data_hash,
    signature_hash,
    signer_name,
    signer_certificate_number,
    signer_certificate_expiration
  )
  VALUES (
    p_entry_id,
    p_instructor_id,
    v_flight_data_hash,
    v_signature_hash,
    v_name,
    v_cert,
    v_exp
  )
  RETURNING id INTO v_signature_id;

  RETURN v_signature_id;
END;
$$;

REVOKE ALL ON FUNCTION sign_log_entry(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sign_log_entry(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION sign_log_entry(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION sign_log_entry(UUID, UUID, TEXT) IS
  'Authenticated instructor only (auth.uid() = instructor). Verifies PIN and roster link, snapshots CFI identity into flight_signatures, clears pending. Lock-on-sign unchanged.';

-- ============================================================================
-- guest_sign_log_entry: require cert # + expiration; snapshot identity
-- ============================================================================

DROP FUNCTION IF EXISTS guest_sign_log_entry(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT);

CREATE OR REPLACE FUNCTION guest_sign_log_entry(
  p_entry_id UUID,
  p_guest_name TEXT,
  p_guest_certificate_number TEXT,
  p_guest_certificate_expiration DATE,
  p_drawn_signature_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_entry log_entries%ROWTYPE;
  v_name TEXT;
  v_cert TEXT;
  v_url TEXT;
  v_sig_id UUID;
  v_signature_hash TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'entry id is required';
  END IF;

  v_name := trim(COALESCE(p_guest_name, ''));
  IF v_name = '' THEN
    RAISE EXCEPTION 'guest name is required';
  END IF;

  v_cert := trim(COALESCE(p_guest_certificate_number, ''));
  IF v_cert = '' THEN
    RAISE EXCEPTION 'certificate number is required';
  END IF;

  IF p_guest_certificate_expiration IS NULL THEN
    RAISE EXCEPTION 'certificate expiration is required';
  END IF;

  v_url := trim(COALESCE(p_drawn_signature_url, ''));
  IF v_url = '' THEN
    RAISE EXCEPTION 'drawn signature url is required';
  END IF;

  SELECT * INTO v_entry
  FROM log_entries
  WHERE id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entry not found';
  END IF;

  IF v_entry.user_id <> v_caller THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF COALESCE(v_entry.is_imported, false) THEN
    RAISE EXCEPTION 'imported entries cannot be signed electronically';
  END IF;

  IF v_entry.data_hash IS NULL OR length(trim(v_entry.data_hash)) = 0 THEN
    RAISE EXCEPTION 'entry is missing data_hash; sync and retry';
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = p_entry_id
  ) THEN
    RAISE EXCEPTION 'entry is already signed';
  END IF;

  UPDATE log_entries
  SET
    signature_pending = false,
    pending_instructor_id = null,
    updated_at = NOW()
  WHERE id = p_entry_id;

  v_signature_hash := public.digest_text_hex(
    v_entry.data_hash || ':' || v_name || ':' || v_cert || ':' ||
      p_guest_certificate_expiration::text || ':' || extract(epoch FROM NOW())::text,
    'sha256'
  );

  INSERT INTO flight_signatures (
    log_entry_id,
    signer_id,
    flight_data_hash,
    signature_hash,
    drawn_signature_url,
    guest_name,
    guest_certificate_number,
    sign_method,
    signer_name,
    signer_certificate_number,
    signer_certificate_expiration
  ) VALUES (
    p_entry_id,
    NULL,
    v_entry.data_hash,
    v_signature_hash,
    v_url,
    v_name,
    v_cert,
    'guest_drawn',
    v_name,
    v_cert,
    p_guest_certificate_expiration
  )
  RETURNING id INTO v_sig_id;

  RETURN v_sig_id;
END;
$$;

REVOKE ALL ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) TO authenticated;

COMMENT ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) IS
  'Owner-only guest drawn signature; requires name, certificate number, and expiration; snapshots CFI identity; locks entry';

-- ============================================================================
-- guest_sign_log_entry_for_session: same identity rules (service_role)
-- ============================================================================

DROP FUNCTION IF EXISTS guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, DATE, TEXT);

CREATE OR REPLACE FUNCTION guest_sign_log_entry_for_session(
  p_session_token TEXT,
  p_guest_name TEXT,
  p_guest_certificate_number TEXT,
  p_guest_certificate_expiration DATE,
  p_drawn_signature_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_session guest_sign_sessions%ROWTYPE;
  v_entry log_entries%ROWTYPE;
  v_name TEXT;
  v_cert TEXT;
  v_url TEXT;
  v_sig_id UUID;
  v_signature_hash TEXT;
BEGIN
  v_name := trim(COALESCE(p_guest_name, ''));
  IF v_name = '' THEN
    RAISE EXCEPTION 'guest name is required';
  END IF;

  v_cert := trim(COALESCE(p_guest_certificate_number, ''));
  IF v_cert = '' THEN
    RAISE EXCEPTION 'certificate number is required';
  END IF;

  IF p_guest_certificate_expiration IS NULL THEN
    RAISE EXCEPTION 'certificate expiration is required';
  END IF;

  v_url := trim(COALESCE(p_drawn_signature_url, ''));
  IF v_url = '' THEN
    RAISE EXCEPTION 'drawn signature url is required';
  END IF;

  SELECT * INTO v_session
  FROM guest_sign_sessions
  WHERE token = trim(COALESCE(p_session_token, ''))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session not found';
  END IF;

  IF v_session.status <> 'pending' THEN
    RAISE EXCEPTION 'session is not pending';
  END IF;

  IF v_session.expires_at <= NOW() THEN
    UPDATE guest_sign_sessions
    SET status = 'expired'
    WHERE id = v_session.id;
    RAISE EXCEPTION 'session has expired';
  END IF;

  SELECT * INTO v_entry
  FROM log_entries
  WHERE id = v_session.log_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entry not found';
  END IF;

  IF v_entry.user_id <> v_session.user_id THEN
    RAISE EXCEPTION 'session entry mismatch';
  END IF;

  IF COALESCE(v_entry.is_imported, false) THEN
    RAISE EXCEPTION 'imported entries cannot be signed electronically';
  END IF;

  IF v_entry.data_hash IS NULL OR length(trim(v_entry.data_hash)) = 0 THEN
    RAISE EXCEPTION 'entry is missing data_hash; sync and retry';
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = v_entry.id
  ) THEN
    RAISE EXCEPTION 'entry is already signed';
  END IF;

  UPDATE log_entries
  SET
    signature_pending = false,
    pending_instructor_id = null,
    updated_at = NOW()
  WHERE id = v_entry.id;

  v_signature_hash := public.digest_text_hex(
    v_entry.data_hash || ':' || v_name || ':' || v_cert || ':' ||
      p_guest_certificate_expiration::text || ':' || extract(epoch FROM NOW())::text,
    'sha256'
  );

  INSERT INTO flight_signatures (
    log_entry_id,
    signer_id,
    flight_data_hash,
    signature_hash,
    drawn_signature_url,
    guest_name,
    guest_certificate_number,
    sign_method,
    signer_name,
    signer_certificate_number,
    signer_certificate_expiration
  ) VALUES (
    v_entry.id,
    NULL,
    v_entry.data_hash,
    v_signature_hash,
    v_url,
    v_name,
    v_cert,
    'guest_drawn',
    v_name,
    v_cert,
    p_guest_certificate_expiration
  )
  RETURNING id INTO v_sig_id;

  UPDATE guest_sign_sessions
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_session.id;

  RETURN v_sig_id;
END;
$$;

REVOKE ALL ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, DATE, TEXT) FROM anon;
REVOKE ALL ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, DATE, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, DATE, TEXT) TO service_role;

COMMENT ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, DATE, TEXT) IS
  'Completes guest drawn signature from a pending QR session; requires cert # and expiration; service_role only';
