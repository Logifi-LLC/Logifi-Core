-- Add optional tags column width to logbook builder templates
ALTER TABLE logbook_builder_templates
  ADD COLUMN IF NOT EXISTS tags_column_width INTEGER;
