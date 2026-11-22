-- FC View OAuth tokens: nonce columns for AES-256-GCM (secretBox / FLICA_CREDENTIALS_KEY)
-- and column privileges so authenticated clients cannot read token material.
-- Existing access_token and refresh_token values are left unchanged.
-- A null nonce means legacy plaintext until the next server write.
-- Apply after review. This file does not run against production by itself.

SET search_path TO public, pg_catalog, pg_temp;

ALTER TABLE public.fcv_integrations
  ADD COLUMN IF NOT EXISTS access_token_nonce TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_nonce TEXT,
  ADD COLUMN IF NOT EXISTS key_version INTEGER;

COMMENT ON TABLE public.fcv_integrations IS
  'FC View OAuth tokens. access_token and refresh_token are AES-256-GCM ciphertext when the matching nonce is set. Null nonce means legacy plaintext. Token columns are service_role only.';

COMMENT ON COLUMN public.fcv_integrations.access_token IS
  'AES-256-GCM ciphertext (secretBox) or legacy plaintext when access_token_nonce is null.';

COMMENT ON COLUMN public.fcv_integrations.refresh_token IS
  'AES-256-GCM ciphertext (secretBox) or legacy plaintext when refresh_token_nonce is null.';

COMMENT ON COLUMN public.fcv_integrations.access_token_nonce IS
  'AES-GCM nonce for access_token. Null marks a legacy plaintext access token.';

COMMENT ON COLUMN public.fcv_integrations.refresh_token_nonce IS
  'AES-GCM nonce for refresh_token. Null marks a legacy plaintext refresh token.';

COMMENT ON COLUMN public.fcv_integrations.key_version IS
  'secretBox key version used when the token pair was sealed. Null on legacy plaintext rows.';

ALTER TABLE public.fcv_integrations ENABLE ROW LEVEL SECURITY;

-- Clients may see connection metadata and delete their own row.
-- Token writes and token reads are service_role (bypasses RLS). No INSERT/UPDATE policy:
-- a later GRANT cannot reopen client token writes without an explicit policy.
DROP POLICY IF EXISTS "Users can view own fcv integration" ON public.fcv_integrations;
CREATE POLICY "Users can view own fcv integration"
  ON public.fcv_integrations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own fcv integration" ON public.fcv_integrations;
DROP POLICY IF EXISTS "Users can update own fcv integration" ON public.fcv_integrations;

DROP POLICY IF EXISTS "Users can delete own fcv integration" ON public.fcv_integrations;
CREATE POLICY "Users can delete own fcv integration"
  ON public.fcv_integrations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Table-level SELECT overrides a column REVOKE, so drop table privileges first,
-- then grant only the columns the app still reads (id for status/disconnect).
REVOKE ALL ON TABLE public.fcv_integrations FROM PUBLIC, anon, authenticated;

REVOKE ALL (
  access_token,
  refresh_token,
  access_token_nonce,
  refresh_token_nonce,
  key_version
) ON TABLE public.fcv_integrations FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  expires_at,
  created_at,
  updated_at
) ON TABLE public.fcv_integrations TO authenticated;

GRANT DELETE ON TABLE public.fcv_integrations TO authenticated;

GRANT ALL ON TABLE public.fcv_integrations TO service_role;
