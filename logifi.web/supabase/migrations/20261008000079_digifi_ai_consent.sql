SET search_path TO public;

-- When the user accepted sharing Digifi logbook page photos with Google Gemini.
-- NULL means not accepted. The app also stores this on device so scans work
-- before this migration is applied.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS digifi_ai_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.digifi_ai_consent_at IS
  'When the user accepted sharing Digifi logbook page photos with Google Gemini. NULL means not accepted.';
