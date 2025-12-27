-- User profiles table (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pilot information
  full_name TEXT,
  certificate_number TEXT,
  date_of_birth DATE,
  place_of_birth TEXT,
  residential_address JSONB,
  mailing_address JSONB,
  
  -- Preferences
  preferences JSONB DEFAULT '{}',
  column_config JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Crew/Instructor profiles
CREATE TABLE crew_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  certificate_number TEXT,
  certificate_type TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX idx_crew_profiles_user_id ON crew_profiles(user_id);

-- RLS
ALTER TABLE crew_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crew profiles"
  ON crew_profiles FOR ALL
  USING (auth.uid() = user_id);

