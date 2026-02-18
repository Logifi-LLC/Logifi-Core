-- Catalog entity tags: tags applied to aircraft family, aircraft (registration), or person.
-- When a tag is added to an entity, it can be backfilled to all matching log entries
-- and auto-filled on future entries when that entity is used.
CREATE TABLE catalog_entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('family', 'aircraft', 'person')),
  entity_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  UNIQUE(user_id, entity_type, entity_id, tag)
);

CREATE INDEX idx_catalog_entity_tags_user_entity ON catalog_entity_tags(user_id, entity_type, entity_id);

ALTER TABLE catalog_entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catalog entity tags"
  ON catalog_entity_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own catalog entity tags"
  ON catalog_entity_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own catalog entity tags"
  ON catalog_entity_tags FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE catalog_entity_tags IS 'Tags attached to catalog entities (family, aircraft, person) for backfill and autofill on log entries';
