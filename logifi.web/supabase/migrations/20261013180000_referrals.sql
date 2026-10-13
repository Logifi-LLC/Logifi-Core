-- Referral codes, permanent attribution, and an idempotent reward ledger.
-- Apply after review. This file does not run against production by itself.
-- Credit grants stay on credit_transactions (service role). Clients can only read their own rows.

SET search_path TO public, pg_catalog, pg_temp;

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_key ON public.referral_codes (code);

COMMENT ON TABLE public.referral_codes IS 'Public share code for each account. Lookups run with the service role.';

-- One referrer per account. referred_by is permanent for the life of both accounts.
CREATE TABLE IF NOT EXISTS public.referrals (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referred_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_no_self CHECK (user_id <> referred_by)
);

COMMENT ON COLUMN public.referrals.referred_by IS 'Referrer account. Set once. No expiry.';

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('friend_bonus', 'referrer_bonus')),
  credits INTEGER NOT NULL CHECK (credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_rewards_once UNIQUE (referred_user_id, kind),
  CONSTRAINT referral_rewards_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referral_rewards_referrer_kind_idx
  ON public.referral_rewards (referrer_user_id, kind);

COMMENT ON TABLE public.referral_rewards IS 'Idempotency ledger for referral credit grants. Refunds do not delete rows.';

-- Cap is 10 referrer bonuses. The lock serializes concurrent first-purchases.
CREATE OR REPLACE FUNCTION public.enforce_referral_reward_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.kind = 'referrer_bonus' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('logifi-referral-cap:' || NEW.referrer_user_id::text, 0));
    IF (
      SELECT count(*)
      FROM public.referral_rewards
      WHERE referrer_user_id = NEW.referrer_user_id
        AND kind = 'referrer_bonus'
    ) >= 10 THEN
      RAISE EXCEPTION 'referral_reward_cap'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referral_rewards_cap ON public.referral_rewards;
CREATE TRIGGER referral_rewards_cap
  BEFORE INSERT ON public.referral_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_referral_reward_cap();

CREATE OR REPLACE FUNCTION public.prevent_referral_reattribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'referral_attribution_permanent'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referrals_permanent ON public.referrals;
CREATE TRIGGER referrals_permanent
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_referral_reattribution();

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referral code" ON public.referral_codes;
CREATE POLICY "Users read own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users read own referral" ON public.referrals;
CREATE POLICY "Users read own referral"
  ON public.referrals FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = referred_by);

DROP POLICY IF EXISTS "Users read own referral rewards" ON public.referral_rewards;
CREATE POLICY "Users read own referral rewards"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = referrer_user_id
    OR (SELECT auth.uid()) = referred_user_id
  );

REVOKE ALL ON public.referral_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.referrals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.referral_rewards FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referrals TO authenticated;
GRANT SELECT ON public.referral_rewards TO authenticated;

GRANT ALL ON public.referral_codes TO service_role;
GRANT ALL ON public.referrals TO service_role;
GRANT ALL ON public.referral_rewards TO service_role;

REVOKE ALL ON FUNCTION public.enforce_referral_reward_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_referral_reattribution() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_referral_reward_cap() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_referral_reattribution() TO service_role;
