-- Import batches table
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Import details
  source_type TEXT NOT NULL, -- 'csv', 'json', 'paper', etc.
  file_name TEXT,
  file_size BIGINT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Statistics
  total_entries INTEGER NOT NULL DEFAULT 0,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  import_metadata JSONB, -- Date range, aircraft list, etc.
  validation_results JSONB -- Validation summary
);

CREATE INDEX idx_import_batches_user_id ON import_batches(user_id, imported_at DESC);

-- RLS for import batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import batches"
  ON import_batches FOR SELECT
  USING (auth.uid() = user_id);

-- Add foreign key constraint for import_batch_id in log_entries
-- Note: This assumes log_entries table already exists from migration 001
ALTER TABLE log_entries
ADD CONSTRAINT fk_import_batch 
FOREIGN KEY (import_batch_id) 
REFERENCES import_batches(id) 
ON DELETE SET NULL;

