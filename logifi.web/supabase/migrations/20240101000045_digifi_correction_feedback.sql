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
