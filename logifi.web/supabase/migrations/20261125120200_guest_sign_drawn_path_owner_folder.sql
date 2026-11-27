-- guest_sign_log_entry: the drawn signature path must be in the caller's own folder.
--
-- The RPC stored any p_drawn_signature_url, and /api/flight-signature/drawn-url signs
-- that path with the service role. A user could guest-sign their own entry with
-- another user's '<uid>/<entry>.png' and then read that image. Both upload paths
-- ('<auth.uid()>/<entry>.<ext>' from the app under the storage policy, and
-- '<owner>/<entry>.<ext>' from the service-role guest session flow) already satisfy
-- the new check. guest_sign_log_entry_for_session (service_role only, path built by
-- the server) is unchanged.
--
-- Body matches 20240101000080 except for the path check. Same signature, so grants
-- are restated, not changed. Existing flight_signatures rows are not touched.

CREATE OR REPLACE FUNCTION public.guest_sign_log_entry(
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

  -- The ink must be the caller's own upload: '<auth.uid()>/<file>' in flight-signatures
  -- (storage policy), optionally bucket-prefixed. Anything else would let
  -- /api/flight-signature/drawn-url sign another user's image.
  IF regexp_replace(v_url, '^flight-signatures/', '') NOT LIKE v_caller::text || '/%'
     OR position('..' IN v_url) > 0 THEN
    RAISE EXCEPTION 'drawn signature must be uploaded to your own folder';
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

REVOKE ALL ON FUNCTION public.guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) TO authenticated;

COMMENT ON FUNCTION public.guest_sign_log_entry(UUID, TEXT, TEXT, DATE, TEXT) IS
  'Owner-only guest drawn signature; requires name, certificate number, and expiration; drawn ink path must be in the caller''s folder; snapshots CFI identity; locks entry';
