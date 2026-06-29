-- ===== 20240101000044_digifi_scans.sql =====
-- Digifi paper logbook scan sessions (temp image metadata, rate limiting)
CREATE TABLE digifi_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  page_side TEXT NOT NULL CHECK (page_side IN ('left', 'right')),
  template_name TEXT,
  layout TEXT NOT NULL DEFAULT 'single' CHECK (layout IN ('single', 'two-page')),
  row_count INTEGER NOT NULL DEFAULT 10,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_digifi_scan_sessions_user_created ON digifi_scan_sessions(user_id, created_at DESC);
CREATE INDEX idx_digifi_scan_sessions_expires ON digifi_scan_sessions(expires_at);

ALTER TABLE digifi_scan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi scan sessions"
  ON digifi_scan_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi scan sessions"
  ON digifi_scan_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Private bucket for temporary scan images (24h retention via app/cron; lifecycle optional on host)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digifi-scans',
  'digifi-scans',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own digifi scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'digifi-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own digifi scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'digifi-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own digifi scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'digifi-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== 20240101000045_digifi_correction_feedback.sql =====
CREATE TABLE digifi_correction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  raw_value TEXT NOT NULL,
  raw_value_key TEXT NOT NULL,
  corrected_value TEXT NOT NULL,
  corrected_value_key TEXT NOT NULL,
  context_key TEXT NOT NULL DEFAULT '',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX digifi_correction_feedback_unique_idx
  ON digifi_correction_feedback(user_id, field_key, raw_value_key, corrected_value_key, context_key);

CREATE INDEX digifi_correction_feedback_lookup_idx
  ON digifi_correction_feedback(user_id, field_key, raw_value_key, context_key, sample_count DESC);

ALTER TABLE digifi_correction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi correction feedback"
  ON digifi_correction_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi correction feedback"
  ON digifi_correction_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digifi correction feedback"
  ON digifi_correction_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== 20240101000046_digifi_companion_capture.sql =====
-- Digifi companion capture sessions and photos for phone-to-web uploads
CREATE TABLE digifi_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  max_photos INTEGER NOT NULL DEFAULT 30 CHECK (max_photos > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '20 minutes'),
  closed_at TIMESTAMPTZ
);

CREATE TABLE digifi_capture_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES digifi_capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  capture_source TEXT NOT NULL DEFAULT 'mobile-web' CHECK (capture_source IN ('mobile-web', 'desktop-upload')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_digifi_capture_sessions_user_created
  ON digifi_capture_sessions(user_id, created_at DESC);
CREATE INDEX idx_digifi_capture_sessions_expires
  ON digifi_capture_sessions(expires_at);
CREATE INDEX idx_digifi_capture_sessions_token
  ON digifi_capture_sessions(token);
CREATE INDEX idx_digifi_capture_photos_session_created
  ON digifi_capture_photos(session_id, created_at DESC);
CREATE INDEX idx_digifi_capture_photos_user_created
  ON digifi_capture_photos(user_id, created_at DESC);

ALTER TABLE digifi_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE digifi_capture_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi capture sessions"
  ON digifi_capture_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi capture sessions"
  ON digifi_capture_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digifi capture sessions"
  ON digifi_capture_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own digifi capture photos"
  ON digifi_capture_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi capture photos"
  ON digifi_capture_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digifi-capture',
  'digifi-capture',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own digifi capture objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'digifi-capture'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own digifi capture objects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'digifi-capture'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own digifi capture objects"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'digifi-capture'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

ALTER PUBLICATION supabase_realtime ADD TABLE digifi_capture_photos;

-- ===== 20240101000047_user_profiles_credits.sql =====
-- Digifi prepaid page credits on user profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0);

COMMENT ON COLUMN user_profiles.credits IS 'Digifi page scan credits (1 credit per page processed)';

-- Prevent authenticated users from self-updating credits via client SDK; service_role API may change it.
CREATE OR REPLACE FUNCTION protect_user_profile_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.credits IS DISTINCT FROM NEW.credits THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.credits := OLD.credits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_credits_trigger ON user_profiles;
CREATE TRIGGER protect_user_profile_credits_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_profile_credits();

-- ===== 20240101000048_digifi_spread_charges.sql =====
-- One Digifi credit per logbook spread (left + right + rescans within same spreadId)

ALTER TABLE digifi_scan_sessions
  ADD COLUMN IF NOT EXISTS spread_id UUID;

CREATE INDEX IF NOT EXISTS idx_digifi_scan_sessions_user_spread
  ON digifi_scan_sessions(user_id, spread_id, page_side);

CREATE TABLE IF NOT EXISTS digifi_spread_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spread_id UUID NOT NULL,
  layout TEXT NOT NULL CHECK (layout IN ('single', 'two-page')),
  credits_charged INTEGER NOT NULL DEFAULT 1 CHECK (credits_charged > 0),
  first_scan_session_id UUID REFERENCES digifi_scan_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, spread_id)
);

CREATE INDEX IF NOT EXISTS idx_digifi_spread_charges_user_created
  ON digifi_spread_charges(user_id, created_at DESC);

ALTER TABLE digifi_spread_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi spread charges"
  ON digifi_spread_charges FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE digifi_spread_charges IS 'Tracks which builder spreadId consumed a Digifi credit (1 per spread session)';

COMMENT ON COLUMN user_profiles.credits IS 'Digifi spread scan credits (1 credit per logbook spread: left+right+rescans)';

-- ===== 20240101000049_credit_transactions.sql =====
-- Append-only ledger for credit purchases and Digifi scan usage

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  type TEXT NOT NULL CHECK (type IN ('purchase', 'scan', 'admin', 'refund')),
  description TEXT,
  spread_id UUID,
  payment_method TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON credit_transactions(user_id, created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE credit_transactions IS 'Audit log for Digifi credit balance changes (service_role inserts only)';

-- ===== 20240101000050_supabase_security_advisor_fixes.sql =====
-- Addresses Supabase Security Advisor findings not fixed by migration 26:
-- 1. search_path on protect_user_profile_credits (added in 47 without it)
-- 2. search_path on is_logifi_white_glove_admin (dashboard-only function, if present)
-- 3. REVOKE EXECUTE on trigger/helper SECURITY DEFINER functions (26 sets search_path only)
-- 4. validate_entry_integrity: ownership via RLS (see 51 for SECURITY INVOKER)

-- ============================================================================
-- search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_profile_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF OLD.credits IS DISTINCT FROM NEW.credits THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.credits := OLD.credits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- White-glove admin helper may exist only in remote DB (not in repo migrations)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_logifi_white_glove_admin'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.is_logifi_white_glove_admin(%s) SET search_path = public, pg_catalog, pg_temp',
      r.args
    );
  END LOOP;
END $$;

-- ============================================================================
-- validate_entry_integrity: restrict RPC to owning user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_entry_integrity(entry_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  computed_hash TEXT
) AS $$
DECLARE
  entry_record public.log_entries%ROWTYPE;
  hash_text TEXT;
  computed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO entry_record
  FROM public.log_entries
  WHERE id = entry_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  hash_text := public.build_entry_hash_text(
    entry_record.date,
    entry_record.aircraft_make_model,
    entry_record.registration,
    entry_record.flight_time,
    entry_record.performance,
    entry_record.version
  );

  computed := public.compute_entry_hash_from_text(hash_text);

  RETURN QUERY
  SELECT
    (entry_record.data_hash = computed) AS is_valid,
    entry_record.data_hash AS current_hash,
    computed AS computed_hash;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) TO authenticated;

-- ============================================================================
-- Trigger-only / unused RPC: block API execution (triggers unaffected)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'log_entry_changes',
        'create_revision_before_update',
        'handle_new_user',
        'get_entry_audit_trail'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      r.proname,
      r.args
    );
  END LOOP;
END $$;

-- Orphan after migration 23 (may already be absent)
DROP FUNCTION IF EXISTS public.create_revision_before_update();

-- ===== 20240101000051_validate_entry_integrity_invoker.sql =====
-- Clear Security Advisor: "Signed-in users can execute SECURITY DEFINER function"
-- on validate_entry_integrity. RLS on log_entries already limits reads to auth.uid().

CREATE OR REPLACE FUNCTION public.validate_entry_integrity(entry_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  computed_hash TEXT
) AS $$
DECLARE
  entry_record public.log_entries%ROWTYPE;
  hash_text TEXT;
  computed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO entry_record
  FROM public.log_entries
  WHERE id = entry_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  hash_text := public.build_entry_hash_text(
    entry_record.date,
    entry_record.aircraft_make_model,
    entry_record.registration,
    entry_record.flight_time,
    entry_record.performance,
    entry_record.version
  );

  computed := public.compute_entry_hash_from_text(hash_text);

  RETURN QUERY
  SELECT
    (entry_record.data_hash = computed) AS is_valid,
    entry_record.data_hash AS current_hash,
    computed AS computed_hash;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) TO authenticated;

-- ===== 20240101000052_welcome_credits.sql =====
-- Welcome Digifi credits: retroactive grant for existing users + signup trigger update
-- Disable credits protection during bulk UPDATE (SQL Editor runs as postgres, not service_role).

ALTER TABLE user_profiles DISABLE TRIGGER protect_user_profile_credits_trigger;

DO $$
DECLARE
  profile_record RECORD;
  new_balance INTEGER;
  welcome_ref TEXT;
BEGIN
  FOR profile_record IN
    SELECT up.id, up.credits
    FROM user_profiles up
    WHERE NOT EXISTS (
      SELECT 1
      FROM credit_transactions ct
      WHERE ct.user_id = up.id
        AND ct.reference_id = 'welcome:' || up.id::text
    )
  LOOP
    welcome_ref := 'welcome:' || profile_record.id::text;
    new_balance := profile_record.credits + 10;

    UPDATE user_profiles
    SET credits = new_balance, updated_at = NOW()
    WHERE id = profile_record.id;

    INSERT INTO credit_transactions (
      user_id,
      amount,
      balance_after,
      type,
      description,
      reference_id
    )
    VALUES (
      profile_record.id,
      10,
      new_balance,
      'admin',
      'Welcome bonus — 10 free Digifi spreads',
      welcome_ref
    );
  END LOOP;
END $$;

ALTER TABLE user_profiles ENABLE TRIGGER protect_user_profile_credits_trigger;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  welcome_ref TEXT;
BEGIN
  welcome_ref := 'welcome:' || NEW.id::text;

  INSERT INTO public.user_profiles (id, credits)
  VALUES (NEW.id, 10)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_after,
    type,
    description,
    reference_id
  )
  SELECT
    NEW.id,
    10,
    10,
    'admin',
    'Welcome bonus — 10 free Digifi spreads',
    welcome_ref
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.credit_transactions
    WHERE user_id = NEW.id
      AND reference_id = welcome_ref
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

COMMENT ON FUNCTION handle_new_user() IS 'Creates user_profiles with 10 welcome Digifi credits and ledger entry on signup';

-- ===== 20240101000053_reconcile_welcome_credits_balance.sql =====
-- Repair credit balances that diverged from the ledger (e.g. welcome migration blocked by protect_user_profile_credits).

ALTER TABLE user_profiles DISABLE TRIGGER protect_user_profile_credits_trigger;

UPDATE user_profiles up
SET credits = latest.balance_after, updated_at = NOW()
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    balance_after
  FROM credit_transactions
  ORDER BY user_id, created_at DESC
) AS latest
WHERE up.id = latest.user_id
  AND up.credits IS DISTINCT FROM latest.balance_after;

ALTER TABLE user_profiles ENABLE TRIGGER protect_user_profile_credits_trigger;

-- ===== 20240101000054_digifi_scan_session_payload.sql =====
-- Persist Digifi OCR output on scan sessions for spread-scoped recovery (24h TTL).

ALTER TABLE digifi_scan_sessions
  ADD COLUMN IF NOT EXISTS scan_payload JSONB;

COMMENT ON COLUMN digifi_scan_sessions.scan_payload IS
  'Extracted rows and diagnostics for client recovery by spreadId before import';

