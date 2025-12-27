-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log entries table (main flight log data)
CREATE TABLE log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic flight information
  date DATE NOT NULL,
  role TEXT NOT NULL,
  aircraft_category_class TEXT NOT NULL,
  category_class_time NUMERIC(5,2),
  aircraft_make_model TEXT NOT NULL,
  registration TEXT NOT NULL,
  flight_number TEXT,
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  route TEXT,
  
  -- Training information
  training_elements TEXT,
  training_instructor TEXT,
  instructor_certificate TEXT,
  
  -- Flight conditions (stored as array)
  flight_conditions TEXT[] DEFAULT '{}',
  remarks TEXT,
  
  -- Flight time breakdown (stored as JSONB for flexibility)
  flight_time JSONB NOT NULL DEFAULT '{}',
  
  -- Performance metrics (stored as JSONB)
  performance JSONB NOT NULL DEFAULT '{}',
  
  -- OOOI times (stored as JSONB)
  oooi JSONB,
  
  -- Metadata
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Compliance fields
  data_hash TEXT, -- SHA-256 hash of entry data for integrity
  version INTEGER DEFAULT 1, -- For revision tracking
  
  -- Import tracking fields
  is_imported BOOLEAN DEFAULT FALSE,
  import_source TEXT, -- 'csv', 'json', 'paper', 'foreflight', 'logten', etc.
  import_batch_id UUID,
  original_entry_date TIMESTAMPTZ, -- Original creation date from source system
  import_metadata JSONB, -- Additional import info
  
  CONSTRAINT valid_date CHECK (date <= CURRENT_DATE),
  CONSTRAINT valid_category_class_time CHECK (category_class_time IS NULL OR category_class_time >= 0)
);

-- Indexes for performance
CREATE INDEX idx_log_entries_user_id ON log_entries(user_id);
CREATE INDEX idx_log_entries_date ON log_entries(user_id, date DESC);
CREATE INDEX idx_log_entries_registration ON log_entries(registration);
CREATE INDEX idx_log_entries_created_at ON log_entries(user_id, created_at DESC);
CREATE INDEX idx_log_entries_import_batch ON log_entries(import_batch_id);
CREATE INDEX idx_log_entries_is_imported ON log_entries(user_id, is_imported);

-- Enable Row Level Security
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own entries
CREATE POLICY "Users can view own entries"
  ON log_entries FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own entries
CREATE POLICY "Users can insert own entries"
  ON log_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own entries
CREATE POLICY "Users can update own entries"
  ON log_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own entries
CREATE POLICY "Users can delete own entries"
  ON log_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_log_entries_updated_at
  BEFORE UPDATE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

