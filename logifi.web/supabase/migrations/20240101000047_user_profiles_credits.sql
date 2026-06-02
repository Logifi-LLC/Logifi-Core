-- Digifi prepaid page credits on user profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0);

COMMENT ON COLUMN user_profiles.credits IS 'Digifi page scan credits (1 credit per page processed)';

-- Prevent authenticated users from self-updating credits via client SDK; service_role API may change it.
CREATE OR REPLACE FUNCTION protect_user_profile_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.credits IS DISTINCT FROM NEW.credits THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.credits := OLD.credits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_credits_trigger ON user_profiles;
CREATE TRIGGER protect_user_profile_credits_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_profile_credits();
