-- Add optional default import role for logbook builder templates
ALTER TABLE logbook_builder_templates
  ADD COLUMN IF NOT EXISTS default_import_role TEXT;
