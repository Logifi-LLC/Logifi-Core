-- Logbook Builder user templates (column layout, row count, single/two-page)
CREATE TABLE logbook_builder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  layout TEXT NOT NULL DEFAULT 'single' CHECK (layout IN ('single', 'two-page')),
  default_row_count INTEGER NOT NULL DEFAULT 10,
  columns JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logbook_builder_templates_user_id ON logbook_builder_templates(user_id, updated_at DESC);

ALTER TABLE logbook_builder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logbook builder templates"
  ON logbook_builder_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logbook builder templates"
  ON logbook_builder_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logbook builder templates"
  ON logbook_builder_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own logbook builder templates"
  ON logbook_builder_templates FOR DELETE
  USING (auth.uid() = user_id);
