-- Repair credit balances that diverged from the ledger (e.g. welcome migration blocked by protect_user_profile_credits).

ALTER TABLE user_profiles DISABLE TRIGGER protect_user_profile_credits_trigger;

UPDATE user_profiles up
SET credits = latest.balance_after, updated_at = NOW()
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    balance_after
  FROM credit_transactions
  ORDER BY user_id, created_at DESC
) AS latest
WHERE up.id = latest.user_id
  AND up.credits IS DISTINCT FROM latest.balance_after;

ALTER TABLE user_profiles ENABLE TRIGGER protect_user_profile_credits_trigger;
