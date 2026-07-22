-- Guest / fill-in instructor drawn signatures (co-located on student device).
-- Imported entries are rejected by RPC; roster PIN path unchanged.

-- ============================================================================
-- Extend flight_signatures for guest_drawn
-- ============================================================================

ALTER TABLE flight_signatures
  ALTER COLUMN signer_id DROP NOT NULL;

ALTER TABLE flight_signatures
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS sign_method TEXT NOT NULL DEFAULT 'roster_pin';

ALTER TABLE flight_signatures
  DROP CONSTRAINT IF EXISTS flight_signatures_sign_method_check;

ALTER TABLE flight_signatures
  ADD CONSTRAINT flight_signatures_sign_method_check
  CHECK (sign_method IN ('roster_pin', 'guest_drawn'));

ALTER TABLE flight_signatures
  DROP CONSTRAINT IF EXISTS flight_signatures_sign_method_fields_check;

ALTER TABLE flight_signatures
  ADD CONSTRAINT flight_signatures_sign_method_fields_check
  CHECK (
    (sign_method = 'roster_pin' AND signer_id IS NOT NULL)
    OR (
      sign_method = 'guest_drawn'
      AND guest_name IS NOT NULL
      AND length(trim(guest_name)) > 0
      AND drawn_signature_url IS NOT NULL
      AND length(trim(drawn_signature_url)) > 0
    )
  );

COMMENT ON COLUMN flight_signatures.sign_method IS
  'roster_pin = linked instructor PIN; guest_drawn = co-located guest wet-ink on student device';
COMMENT ON COLUMN flight_signatures.guest_name IS
  'Display name of guest / fill-in instructor when sign_method = guest_drawn';
COMMENT ON COLUMN flight_signatures.guest_certificate_number IS
  'Optional CFI / certificate number for guest signer';

-- ============================================================================
-- Storage: private flight signature drawings
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flight-signatures',
  'flight-signatures',
  false,
  2097152,
  ARRAY['image/png', 'image/webp', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own flight signatures" ON storage.objects;
CREATE POLICY "Users can upload own flight signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'flight-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own flight signatures" ON storage.objects;
CREATE POLICY "Users can read own flight signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'flight-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own flight signatures" ON storage.objects;
CREATE POLICY "Users can update own flight signatures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'flight-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own flight signatures" ON storage.objects;
CREATE POLICY "Users can delete own flight signatures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'flight-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- RPC: guest_sign_log_entry (entry owner only; no roster / PIN)
-- ============================================================================

CREATE OR REPLACE FUNCTION guest_sign_log_entry(
  p_entry_id UUID,
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

  v_url := trim(COALESCE(p_drawn_signature_url, ''));
  IF v_url = '' THEN
    RAISE EXCEPTION 'drawn signature url is required';
  END IF;

  v_cert := nullif(trim(COALESCE(p_guest_certificate_number, '')), '');

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

  -- Clear pending before insert (signed rows cannot be updated)
  UPDATE log_entries
  SET
    signature_pending = false,
    pending_instructor_id = null,
    updated_at = NOW()
  WHERE id = p_entry_id;

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
    p_entry_id,
    NULL,
    v_entry.data_hash,
    v_signature_hash,
    v_url,
    v_name,
    v_cert,
    'guest_drawn'
  )
  RETURNING id INTO v_sig_id;

  RETURN v_sig_id;
END;
$$;

REVOKE ALL ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION guest_sign_log_entry(UUID, TEXT, TEXT, TEXT) IS
  'Owner-only guest drawn signature; locks entry via flight_signatures; rejects imports';
