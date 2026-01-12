-- Add INSERT policy for import_batches
CREATE POLICY "Users can insert own import batches"
  ON import_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for import_batches
CREATE POLICY "Users can update own import batches"
  ON import_batches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for import_batches (optional, for cleanup)
CREATE POLICY "Users can delete own import batches"
  ON import_batches FOR DELETE
  USING (auth.uid() = user_id);







