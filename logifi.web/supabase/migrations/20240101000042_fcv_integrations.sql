-- FC View OAuth integration: one row per user, tokens stored server-side only
CREATE TABLE fcv_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_fcv_integrations_user_id ON fcv_integrations(user_id);

ALTER TABLE fcv_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fcv integration"
  ON fcv_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fcv integration"
  ON fcv_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fcv integration"
  ON fcv_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fcv integration"
  ON fcv_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_fcv_integrations_updated_at
  BEFORE UPDATE ON fcv_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE fcv_integrations IS 'FC View OAuth tokens; access_token and refresh_token must only be read/written by server.';
