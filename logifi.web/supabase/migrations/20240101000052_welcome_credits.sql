-- Welcome Digifi credits: retroactive grant for existing users + signup trigger update
-- Disable credits protection during bulk UPDATE (SQL Editor runs as postgres, not service_role).

ALTER TABLE user_profiles DISABLE TRIGGER protect_user_profile_credits_trigger;

DO $$
DECLARE
  profile_record RECORD;
  new_balance INTEGER;
  welcome_ref TEXT;
BEGIN
  FOR profile_record IN
    SELECT up.id, up.credits
    FROM user_profiles up
    WHERE NOT EXISTS (
      SELECT 1
      FROM credit_transactions ct
      WHERE ct.user_id = up.id
        AND ct.reference_id = 'welcome:' || up.id::text
    )
  LOOP
    welcome_ref := 'welcome:' || profile_record.id::text;
    new_balance := profile_record.credits + 10;

    UPDATE user_profiles
    SET credits = new_balance, updated_at = NOW()
    WHERE id = profile_record.id;

    INSERT INTO credit_transactions (
      user_id,
      amount,
      balance_after,
      type,
      description,
      reference_id
    )
    VALUES (
      profile_record.id,
      10,
      new_balance,
      'admin',
      'Welcome bonus — 10 free Digifi spreads',
      welcome_ref
    );
  END LOOP;
END $$;

ALTER TABLE user_profiles ENABLE TRIGGER protect_user_profile_credits_trigger;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  welcome_ref TEXT;
BEGIN
  welcome_ref := 'welcome:' || NEW.id::text;

  INSERT INTO public.user_profiles (id, credits)
  VALUES (NEW.id, 10)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_after,
    type,
    description,
    reference_id
  )
  SELECT
    NEW.id,
    10,
    10,
    'admin',
    'Welcome bonus — 10 free Digifi spreads',
    welcome_ref
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.credit_transactions
    WHERE user_id = NEW.id
      AND reference_id = welcome_ref
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp;

COMMENT ON FUNCTION handle_new_user() IS 'Creates user_profiles with 10 welcome Digifi credits and ledger entry on signup';
