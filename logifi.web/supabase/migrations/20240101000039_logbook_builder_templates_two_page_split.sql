-- Add optional two-page split index for logbook builder templates
ALTER TABLE logbook_builder_templates
  ADD COLUMN IF NOT EXISTS two_page_split_index INTEGER;
