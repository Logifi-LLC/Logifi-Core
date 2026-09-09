SET search_path TO public;

-- Change digifi_learning_opt_in to default TRUE (opt-out model)
-- Users must explicitly opt OUT; missing/null = opted in

-- Change column default to TRUE
ALTER TABLE user_profiles
  ALTER COLUMN digifi_learning_opt_in SET DEFAULT TRUE;

-- Update existing NULL values to TRUE (opted in by default)
UPDATE user_profiles
SET digifi_learning_opt_in = TRUE
WHERE digifi_learning_opt_in IS NULL;

-- Update column comment to reflect opt-out model
COMMENT ON COLUMN user_profiles.digifi_learning_opt_in IS 'User has Digifi learning enabled (default TRUE, opt-out model). Only explicit FALSE means disabled.';
