-- Allow users to update their own catalog_entity_tags (e.g. when renaming a family, entity_id is updated).
CREATE POLICY "Users can update own catalog entity tags"
  ON catalog_entity_tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
