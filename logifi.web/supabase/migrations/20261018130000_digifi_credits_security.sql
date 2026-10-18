-- Digifi credits: idempotent purchase references + atomic balance updates (service_role only).
--
-- Pre-check before applying (resolve duplicates manually):
-- SELECT reference_id, COUNT(*) AS n
-- FROM credit_transactions
-- WHERE reference_id IS NOT NULL
-- GROUP BY reference_id
-- HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_reference_id_unique
  ON credit_transactions (reference_id)
  WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION service_increment_user_credits(
  p_user_id UUID,
  p_delta INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only service_role may change credits balance'
      USING ERRCODE = '42501';
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'delta must be a non-zero integer'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO user_profiles (id, credits)
  VALUES (p_user_id, 0)
  ON CONFLICT (id) DO NOTHING;

  UPDATE user_profiles
  SET
    credits = credits + p_delta,
    updated_at = NOW()
  WHERE id = p_user_id
    AND credits + p_delta >= 0
  RETURNING credits INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits or user profile missing'
      USING ERRCODE = '22023';
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION service_increment_user_credits(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION service_increment_user_credits(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION service_increment_user_credits(UUID, INTEGER) IS
  'Atomically adjust user_profiles.credits; service_role only (Nitro credits API).';
