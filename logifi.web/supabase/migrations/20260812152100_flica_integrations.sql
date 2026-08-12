-- FLICA portal credentials (encrypted at rest by app). One row per user per airline.
CREATE TABLE flica_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  airline_code TEXT NOT NULL DEFAULT 'RJET',
  portal_host TEXT NOT NULL DEFAULT 'rpa.flica.net',
  username TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  password_nonce TEXT NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  last_ok_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, airline_code)
);

CREATE INDEX idx_flica_integrations_user_id ON flica_integrations(user_id);

ALTER TABLE flica_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flica integration"
  ON flica_integrations FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own flica integration"
  ON flica_integrations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own flica integration"
  ON flica_integrations FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own flica integration"
  ON flica_integrations FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER update_flica_integrations_updated_at
  BEFORE UPDATE ON flica_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE flica_integrations IS
  'FLICA portal credentials; password_ciphertext/nonce must only be used server-side and never returned to clients.';
