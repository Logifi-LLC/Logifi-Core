-- Guest sign phone companion sessions (QR → phone pad, no account).

CREATE TABLE IF NOT EXISTS guest_sign_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_sign_sessions_token
  ON guest_sign_sessions (token);

CREATE INDEX IF NOT EXISTS idx_guest_sign_sessions_user_entry
  ON guest_sign_sessions (user_id, log_entry_id);

CREATE INDEX IF NOT EXISTS idx_guest_sign_sessions_expires
  ON guest_sign_sessions (expires_at);

ALTER TABLE guest_sign_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own guest sign sessions" ON guest_sign_sessions;
CREATE POLICY "Owners can view own guest sign sessions"
  ON guest_sign_sessions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert own guest sign sessions" ON guest_sign_sessions;
CREATE POLICY "Owners can insert own guest sign sessions"
  ON guest_sign_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own guest sign sessions" ON guest_sign_sessions;
CREATE POLICY "Owners can update own guest sign sessions"
  ON guest_sign_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE guest_sign_sessions IS
  'Short-lived tokens for co-located guest instructor phone signing via QR';

-- ============================================================================
-- RPC: complete guest sign from validated session token (server / service role)
-- ============================================================================

CREATE OR REPLACE FUNCTION guest_sign_log_entry_for_session(
  p_session_token TEXT,
  p_guest_name TEXT,
  p_guest_certificate_number TEXT,
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

  v_url := trim(COALESCE(p_drawn_signature_url, ''));
  IF v_url = '' THEN
    RAISE EXCEPTION 'drawn signature url is required';
  END IF;

  v_cert := nullif(trim(COALESCE(p_guest_certificate_number, '')), '');

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
    v_entry.data_hash || ':' || v_name || ':' || COALESCE(v_cert, '') || ':' ||
      extract(epoch FROM NOW())::text,
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
    sign_method
  ) VALUES (
    v_entry.id,
    NULL,
    v_entry.data_hash,
    v_signature_hash,
    v_url,
    v_name,
    v_cert,
    'guest_drawn'
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

REVOKE ALL ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION guest_sign_log_entry_for_session(TEXT, TEXT, TEXT, TEXT) IS
  'Completes guest drawn signature from a pending QR session token; locks entry';
