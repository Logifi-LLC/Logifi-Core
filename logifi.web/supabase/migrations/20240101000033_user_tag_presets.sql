-- User tag presets: custom tag labels saved so they appear as options next time (e.g. Turbine, Part 135).
CREATE TABLE user_tag_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_user_tag_presets_user_id ON user_tag_presets(user_id);

ALTER TABLE user_tag_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tag presets"
  ON user_tag_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tag presets"
  ON user_tag_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tag presets"
  ON user_tag_presets FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_tag_presets IS 'Custom tag labels saved by user so they appear as preset options (e.g. Turbine)';
