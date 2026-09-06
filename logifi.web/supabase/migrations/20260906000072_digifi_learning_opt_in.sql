SET search_path TO public;

-- Add digifi learning opt-in flags to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS digifi_learning_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS digifi_learning_opted_in_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.digifi_learning_opt_in IS 'User opted into saving Digifi corrections and vocabulary for personalization';
COMMENT ON COLUMN user_profiles.digifi_learning_opted_in_at IS 'When user opted into Digifi learning';

-- Create digifi_user_vocabulary table for aircraft and airport learning
CREATE TABLE digifi_user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_type TEXT NOT NULL CHECK (vocab_type IN ('aircraft', 'airport')),
  value TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, vocab_type, value)
);

CREATE INDEX digifi_user_vocabulary_user_type_idx
  ON digifi_user_vocabulary(user_id, vocab_type, last_seen_at DESC);

ALTER TABLE digifi_user_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi vocabulary"
  ON digifi_user_vocabulary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi vocabulary"
  ON digifi_user_vocabulary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digifi vocabulary"
  ON digifi_user_vocabulary FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own digifi vocabulary"
  ON digifi_user_vocabulary FOR DELETE
  USING (auth.uid() = user_id);

-- Grandfather existing users: if they have correction feedback or scan history, opt them in
UPDATE user_profiles up
SET 
  digifi_learning_opt_in = TRUE,
  digifi_learning_opted_in_at = NOW()
WHERE 
  digifi_learning_opt_in = FALSE
  AND EXISTS (
    SELECT 1 FROM digifi_correction_feedback dcf
    WHERE dcf.user_id = up.id
    LIMIT 1
  );
