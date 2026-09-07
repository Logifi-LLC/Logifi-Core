-- Add preferred sink/destination for Digifi flows
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS digifi_preferred_sink TEXT CHECK (digifi_preferred_sink IN ('logten', 'logifi', NULL));

COMMENT ON COLUMN user_profiles.digifi_preferred_sink IS 'User preference for where Digifi should send scanned flights: logten (LogTen Pro), logifi (Logifi logbook), or NULL (no preference set yet)';
